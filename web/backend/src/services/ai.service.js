const AnalysisReport = require('../models/AnalysisReport');
const { llm, sources } = require('../config/env');

const DEFAULT_TIMEOUT_MS = Math.min(sources.externalApiTimeoutMs || 30000, 90000);

function compactText(value, limit = 4000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
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
  const cleanTitle = compactText(title, 180) || 'Bài báo';
  const cleanAbstract = compactText(abstract, 900);
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
    title: compactText(title, 250),
    abstract: compactText(abstract, 5000),
    year,
    source,
    keywords: Array.isArray(keywords) ? keywords.slice(0, 8).map((k) => compactText(k, 80)) : [],
  };

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
    return { summary: text, provider: 'gemini', model: llm.geminiModel };
  } catch (err) {
    return {
      summary: fallbackSummary(title, abstract),
      provider: 'fallback',
      reason: reasonCode(err),
    };
  }
}

async function explainTerm({ term, context }) {
  const cleanTerm = compactText(term, 120);
  const cleanContext = compactText(context, 1200);

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
    return { term: cleanTerm, explanation, provider: 'gemini', model: llm.geminiModel };
  } catch (err) {
    return {
      term: cleanTerm,
      explanation: `"${cleanTerm}" là một thuật ngữ cần được giải thích dựa trên ngữ cảnh nghiên cứu cụ thể. Hiện AI service chưa khả dụng nên hệ thống trả lời fallback.`,
      provider: 'fallback',
      reason: reasonCode(err),
    };
  }
}

async function suggestDirections({ field, gaps = [] }) {
  const cleanField = compactText(field, 160) || 'lĩnh vực đã chọn';
  const publicGaps = Array.isArray(gaps)
    ? gaps.slice(0, 8).map((gap) => ({
      field: compactText(gap.field || gap.fieldLabel || cleanField, 120),
      aspect: compactText(gap.aspect, 120),
      density: Number(gap.density || 0),
      interest: Number(gap.interest || 0),
      papers: Number(gap.papers || 0),
      keywords: Array.isArray(gap.keywords) ? gap.keywords.slice(0, 5).map((k) => compactText(k, 80)) : [],
    }))
    : [];

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
    return {
      directions: Array.isArray(parsed.directions) && parsed.directions.length
        ? parsed.directions.slice(0, 5)
        : fallbackDirections,
      provider: 'gemini',
      model: llm.geminiModel,
    };
  } catch (err) {
    return { directions: fallbackDirections, provider: 'fallback', reason: reasonCode(err) };
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
    return {
      summary: parsed.summary || fallback.summary,
      directions: Array.isArray(parsed.directions) ? parsed.directions.slice(0, 3) : fallback.directions,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 8) : fallback.evidence,
      provider: 'gemini',
      model: llm.geminiModel,
    };
  } catch (err) {
    return { ...fallback, provider: 'fallback', reason: reasonCode(err) };
  }
}

module.exports = {
  summarizePaper,
  explainTerm,
  suggestDirections,
  getInsights,
};
