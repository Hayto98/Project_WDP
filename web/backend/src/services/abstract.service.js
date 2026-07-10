const { llm, sources: sourceConfig } = require('../config/env');

function authorNames(authors = []) {
  return authors
    .map((author) => (typeof author === 'string' ? author : author.name))
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');
}

function notFoundMessage(paper) {
  return `[Abstract not found] Không tìm được abstract nguyên văn từ nguồn gốc cho bài "${paper.title}". Vui lòng kiểm tra trực tiếp tại ${paper.doi ? `DOI ${paper.doi}` : paper.original_url || paper.source_name || 'nguồn xuất bản'}.`;
}

function cleanGeneratedText(value) {
  return String(value || '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const entries = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) entries[position] = word;
  }
  return entries.filter(Boolean).join(' ').trim();
}

function normalizeDoi(doiOrUrl = '') {
  return String(doiOrUrl)
    .replace(/^https?:\/\/doi\.org\//i, '')
    .trim();
}

async function findOpenAlexAbstract(paper) {
  const doi = normalizeDoi(paper.doi || (String(paper.original_url || '').includes('doi.org/') ? paper.original_url : ''));
  if (!doi) return '';

  const url = new URL(`/works/doi:${doi}`, sourceConfig.openAlexApiUrl || 'https://api.openalex.org');
  if (sourceConfig.openAlexMailto) url.searchParams.set('mailto', sourceConfig.openAlexMailto);

  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const body = await res.json();
    return decodeOpenAlexAbstract(body.abstract_inverted_index);
  } catch {
    return '';
  }
}

async function findOriginalAbstractWithLlm(paper) {
  const openAlexAbstract = await findOpenAlexAbstract(paper);
  if (openAlexAbstract) return openAlexAbstract;

  if (!llm.geminiApiKey) return notFoundMessage(paper);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const models = Array.from(new Set([llm.geminiModel || 'gemini-2.0-flash', 'gemini-1.5-flash']));

  const prompt = [
    `Tìm và trích dẫn nguyên văn abstract của bài "${paper.title || 'Unknown'}" do ${authorNames(paper.authors) || 'Unknown author'} viết năm ${paper.publication_year || 'Unknown year'}, mã số Crossref/DOI là ${paper.doi || paper.original_url || 'không rõ'}.`,
    'Nếu không tìm được văn bản gốc từ nhà xuất bản hoặc nguồn chỉ mục đáng tin cậy, hãy trả lời đúng câu sau và không tự viết abstract:',
    `"${notFoundMessage(paper)}"`,
    'Quy tắc bắt buộc:',
    '- Chỉ trả về abstract nguyên văn nếu có thể xác định là abstract gốc.',
    '- Không tóm tắt, không diễn giải, không viết abstract mới từ metadata.',
    '- Nếu không chắc, trả về thông báo không tìm được.',
    '- Không thêm lời giải thích ngoài abstract hoặc thông báo không tìm được.',
    '',
    `Title: ${paper.title || 'Unknown'}`,
    `Authors: ${authorNames(paper.authors) || 'Unknown'}`,
    `Year: ${paper.publication_year || 'Unknown'}`,
    `Source: ${paper.source_name || 'Unknown'}`,
    `Type: ${paper.type || 'Unknown'}`,
    `DOI/URL: ${paper.doi || paper.original_url || 'Unknown'}`,
  ].join('\n');

  try {
    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${llm.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 180,
            },
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) continue;

      const generated = cleanGeneratedText(body.candidates?.[0]?.content?.parts?.[0]?.text);
      if (generated) return generated;
    }
    return notFoundMessage(paper);
  } catch {
    return notFoundMessage(paper);
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureAbstracts(papers = []) {
  const next = [];
  for (const paper of papers) {
    const currentAbstract = String(paper.abstract || '').trim();
    if (
      currentAbstract
      && !currentAbstract.startsWith('[AI-generated from metadata]')
      && !currentAbstract.startsWith('[Abstract not found]')
    ) {
      next.push(paper);
      continue;
    }

    const abstract = await findOriginalAbstractWithLlm(paper);
    if (paper._id) {
      try {
        const Paper = require('../models/Paper');
        await Paper.updateOne({ _id: paper._id }, { abstract });
      } catch {
        // Return the lookup result even if persistence fails.
      }
    }
    next.push({ ...paper, abstract });
  }
  return next;
}

module.exports = {
  findOriginalAbstractWithLlm,
  ensureAbstracts,
};
