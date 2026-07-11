const AnalysisReport = require('../models/AnalysisReport');
const Paper = require('../models/Paper');
const { llm, sources } = require('../config/env');

const DEFAULT_TIMEOUT_MS = Math.min(sources.externalApiTimeoutMs || 30000, 90000);
const AI_CACHE_TTL_MS = 10 * 60 * 1000;
const aiCache = new Map();

function compactText(value, limit = 4000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function redactPII(value) {
  return compactText(value, 10000)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(?:\+?\d[\s-.()]*){8,}\d/g, '[redacted-phone]');
}

function cleanPublicText(value, limit = 4000) {
  return compactText(redactPII(value), limit);
}

function cacheKey(scope, payload) {
  return `${scope}:${JSON.stringify(payload)}`;
}

function getCached(key) {
  const hit = aiCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.createdAt > AI_CACHE_TTL_MS) {
    aiCache.delete(key);
    return null;
  }
  return { ...hit.value, cached: true };
}

function setCached(key, value) {
  aiCache.set(key, { value, createdAt: Date.now() });
  if (aiCache.size > 500) {
    const oldestKey = aiCache.keys().next().value;
    if (oldestKey) aiCache.delete(oldestKey);
  }
  return value;
}

function safeJsonParse(text, fallback) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

function reasonCode(err) {
  if (err.code) return err.code;
  if (err.statusCode === 429) return 'LLM_QUOTA_EXCEEDED';
  if (err.statusCode === 401 || err.statusCode === 403) return 'LLM_AUTH_FAILED';
  if (err.name === 'AbortError') return 'LLM_TIMEOUT';
  return 'LLM_UNAVAILABLE';
}

function fallbackSummary(title, abstract) {
  const cleanTitle = cleanPublicText(title, 180) || 'Bài báo';
  const cleanAbstract = cleanPublicText(abstract, 900);
  if (!cleanAbstract) {
    return `${cleanTitle}: chưa có abstract công khai để tóm tắt.`;
  }
  return `${cleanTitle}: ${cleanAbstract.slice(0, 260)}${cleanAbstract.length > 260 ? '...' : ''}`;
}

async function callGemini(prompt, options = {}) {
  if (llm.provider !== 'gemini' || !llm.geminiApiKey) {
    const err = new Error('Gemini API key is not configured');
    err.code = 'LLM_NOT_CONFIGURED';
    throw err;
  }

  const model = options.model || llm.geminiModel || 'gemini-2.0-flash';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(llm.geminiApiKey)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.35,
          maxOutputTokens: options.maxOutputTokens || 900,
          responseMimeType: options.json ? 'application/json' : 'text/plain',
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Gemini request failed with ${response.status}`;
      const err = new Error(message);
      err.statusCode = response.status;
      throw err;
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) throw new Error('Gemini returned an empty response');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function summarizePaper({ title, abstract, year, source, keywords = [] }) {
  const publicContext = {
    title: cleanPublicText(title, 250),
    abstract: cleanPublicText(abstract, 5000),
    year,
    source: cleanPublicText(source, 100),
    keywords: Array.isArray(keywords) ? keywords.slice(0, 8).map((k) => cleanPublicText(k, 80)) : [],
  };
  const key = cacheKey('summary', publicContext);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const text = await callGemini(
      [
        'Bạn là trợ lý nghiên cứu khoa học. Chỉ dùng metadata/abstract công khai dưới đây.',
        'Không bịa kết quả, không suy đoán ngoài dữ liệu.',
        'Viết tiếng Việt, 3-5 câu, nêu mục tiêu, phương pháp/chủ đề chính và đóng góp/ý nghĩa nếu có.',
        '',
        JSON.stringify(publicContext, null, 2),
      ].join('\n'),
      { maxOutputTokens: 500 },
    );
    return setCached(key, { summary: text, provider: 'gemini', model: llm.geminiModel });
  } catch (err) {
    return setCached(key, {
      summary: fallbackSummary(title, abstract),
      provider: 'fallback',
      reason: reasonCode(err),
    });
  }
}

async function explainTerm({ term, context }) {
  const cleanTerm = cleanPublicText(term, 120);
  const cleanContext = cleanPublicText(context, 1200);
  const key = cacheKey('term', { term: cleanTerm, context: cleanContext });
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const explanation = await callGemini(
      [
        'Giải thích thuật ngữ nghiên cứu sau bằng tiếng Việt cho sinh viên/cộng sự nghiên cứu.',
        'Không dùng dữ liệu cá nhân. Nếu có ngữ cảnh, chỉ dùng ngữ cảnh công khai đó.',
        'Trả lời 2-4 câu, có ví dụ ngắn nếu hữu ích.',
        '',
        `Thuật ngữ: ${cleanTerm}`,
        cleanContext ? `Ngữ cảnh: ${cleanContext}` : '',
      ].join('\n'),
      { maxOutputTokens: 450 },
    );
    return setCached(key, { term: cleanTerm, explanation, provider: 'gemini', model: llm.geminiModel });
  } catch (err) {
    return setCached(key, {
      term: cleanTerm,
      explanation: `"${cleanTerm}" là một thuật ngữ cần được giải thích dựa trên ngữ cảnh nghiên cứu cụ thể. Hiện AI service chưa khả dụng nên hệ thống trả lời fallback.`,
      provider: 'fallback',
      reason: reasonCode(err),
    });
  }
}

async function suggestDirections({ field, gaps = [] }) {
  const cleanField = cleanPublicText(field, 160) || 'lĩnh vực đã chọn';
  const publicGaps = Array.isArray(gaps)
    ? gaps.slice(0, 8).map((gap) => ({
      field: cleanPublicText(gap.field || gap.fieldLabel || cleanField, 120),
      aspect: cleanPublicText(gap.aspect, 120),
      density: Number(gap.density || 0),
      interest: Number(gap.interest || 0),
      papers: Number(gap.papers || 0),
      keywords: Array.isArray(gap.keywords) ? gap.keywords.slice(0, 5).map((k) => cleanPublicText(k, 80)) : [],
    }))
    : [];
  const key = cacheKey('directions', { field: cleanField, gaps: publicGaps });
  const cached = getCached(key);
  if (cached) return cached;

  const fallbackDirections = publicGaps.length
    ? publicGaps.slice(0, 3).map((gap) => ({
      topic: `${gap.field} / ${gap.aspect || 'khoảng trống mới'}`,
      rationale: `Mật độ công bố ${gap.density} với mức quan tâm ${gap.interest}; nên kiểm tra thêm paper nền và dữ liệu đánh giá trước khi chọn đề tài.`,
    }))
    : [{
      topic: `Hướng nghiên cứu mới trong ${cleanField}`,
      rationale: 'Chưa đủ gap data để AI đề xuất chi tiết; cần bổ sung corpus hoặc chạy refresh reports.',
    }];

  try {
    const text = await callGemini(
      [
        'Bạn là cố vấn nghiên cứu. Dựa trên gap data công khai, đề xuất 3 hướng nghiên cứu khả thi.',
        'Trả về JSON thuần dạng {"directions":[{"topic":"...","rationale":"..."}]}.',
        'Không bịa paper cụ thể. Không dùng hoặc yêu cầu PII.',
        '',
        JSON.stringify({ field: cleanField, gaps: publicGaps }, null, 2),
      ].join('\n'),
      { json: true, maxOutputTokens: 800, temperature: 0.45 },
    );
    const parsed = safeJsonParse(text, { directions: fallbackDirections });
    return setCached(key, {
      directions: Array.isArray(parsed.directions) && parsed.directions.length
        ? parsed.directions.slice(0, 5)
        : fallbackDirections,
      provider: 'gemini',
      model: llm.geminiModel,
    });
  } catch (err) {
    return setCached(key, { directions: fallbackDirections, provider: 'fallback', reason: reasonCode(err) });
  }
}

async function getInsights() {
  const report = await AnalysisReport.findOne({ report_type: 'ResearchGap' })
    .sort({ generated_at: -1 })
    .lean();

  const snapshot = report?.result_snapshot || {};
  const gaps = (snapshot.gaps || [])
    .filter((gap) => gap.gap || gap.isGap || Number(gap.score || 0) >= 0.35)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 8);

  const evidence = (snapshot.fields || []).map((field) => ({
    label: field.label || field,
    papers: (snapshot.gaps || [])
      .filter((gap) => (gap.fieldLabel || gap.field) === (field.label || field))
      .reduce((sum, gap) => sum + Number(gap.papers || 0), 0),
  }));

  const fallback = {
    summary: snapshot.ai?.summary || 'Chưa đủ dữ liệu AI insights; hãy refresh reports hoặc bổ sung corpus.',
    directions: snapshot.ai?.directions || gaps.slice(0, 3).map((gap) => ({
      topic: `${gap.fieldLabel || gap.field} / ${gap.aspect}`,
      rationale: gap.direction || 'Khoảng trống có mật độ thấp và mức quan tâm tương đối cao.',
    })),
    evidence,
  };
  const key = cacheKey('insights', { gaps, evidence });
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const text = await callGemini(
      [
        'Bạn là trợ lý phân tích xu hướng nghiên cứu. Chỉ dùng dữ liệu gap công khai dưới đây.',
        'Trả về JSON thuần dạng:',
        '{"summary":"...","directions":[{"topic":"...","rationale":"..."}],"evidence":[{"label":"...","papers":123}]}',
        'summary tiếng Việt, ngắn gọn. directions tối đa 3 mục. Không bịa paper hay số liệu ngoài input.',
        '',
        JSON.stringify({ gaps, evidence }, null, 2),
      ].join('\n'),
      { json: true, maxOutputTokens: 900, temperature: 0.4 },
    );
    const parsed = safeJsonParse(text, fallback);
    return setCached(key, {
      summary: parsed.summary || fallback.summary,
      directions: Array.isArray(parsed.directions) ? parsed.directions.slice(0, 3) : fallback.directions,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 8) : fallback.evidence,
      provider: 'gemini',
      model: llm.geminiModel,
    });
  } catch (err) {
    return setCached(key, { ...fallback, provider: 'fallback', reason: reasonCode(err) });
  }
}

async function getRelatedPapers({ paperId, title, keywords = [], fields = [], limit = 5 }) {
  const cleanKeywords = Array.isArray(keywords) ? keywords.map((k) => compactText(k, 80)).filter(Boolean) : [];
  const cleanFields = Array.isArray(fields) ? fields.map((f) => compactText(f, 120)).filter(Boolean) : [];
  const cleanTitle = compactText(title, 240);
  const queryText = [cleanTitle, ...cleanKeywords, ...cleanFields].filter(Boolean).join(' ');
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 5, 10));

  const filter = { status: { $ne: 'Archived' } };
  if (paperId) filter._id = { $ne: paperId };

  const or = [];
  if (cleanKeywords.length) or.push({ keywords: { $in: cleanKeywords } });
  if (cleanFields.length) or.push({ research_fields: { $in: cleanFields } });
  if (queryText) or.push({ $text: { $search: queryText } });

  const query = or.length ? { ...filter, $or: or } : filter;
  const projection = queryText ? { score: { $meta: 'textScore' } } : {};
  const sort = queryText ? { score: { $meta: 'textScore' }, citation_count: -1 } : { citation_count: -1, publication_year: -1 };

  let papers = await Paper.find(query, projection)
    .sort(sort)
    .limit(cappedLimit)
    .lean();

  if (!papers.length && queryText) {
    papers = await Paper.find(filter)
      .sort({ citation_count: -1, publication_year: -1 })
      .limit(cappedLimit)
      .lean();
  }

  return {
    related: papers.map((paper) => ({
      id: paper._id,
      title: paper.title,
      authors: (paper.authors || []).map((author) => author.name).filter(Boolean),
      year: paper.publication_year,
      source: paper.source_name,
      type: paper.type,
      fields: paper.research_fields || [],
      keywords: paper.keywords || [],
      abstract: paper.abstract || '',
      citations: paper.citation_count || 0,
      doi: paper.doi || '',
      url: paper.original_url || '',
    })),
    provider: 'corpus',
  };
}

module.exports = {
  summarizePaper,
  explainTerm,
  suggestDirections,
  getInsights,
  getRelatedPapers,
  _private: {
    redactPII,
    cleanPublicText,
  },
};
