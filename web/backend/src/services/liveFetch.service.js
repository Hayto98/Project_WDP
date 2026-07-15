const { normalizeDoi } = require('./paperCleaning.service');

const DEFAULT_SOURCES = ['OpenAlex', 'Crossref', 'arXiv'];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with', 'by', 'from',
  'using', 'based', 'via', 'into', 'over', 'under', 'between', 'among', 'as', 'at',
  'is', 'are', 'was', 'were', 'be', 'been', 'been', 'this', 'that', 'these', 'those',
  'model', 'models', 'system', 'systems', 'data', 'method', 'methods', 'approach',
  'study', 'studies', 'paper', 'research', 'analysis', 'application', 'applications',
  'new', 'novel', 'towards', 'toward', 'use', 'used', 'learning', 'network', 'networks',
  'deep', 'image', 'images', 'based', 'using', 'framework', 'results',
]);

const ALIASES = {
  'large language model': ['llm', 'large language models', 'language model', 'gpt'],
  'retrieval augmented generation': ['rag', 'retrieval-augmented generation'],
  'federated learning': ['fl', 'federated optimization'],
  'medical imaging': ['radiology', 'medical image', 'mri', 'ct imaging'],
  'computer vision': ['cv', 'image recognition', 'visual recognition'],
  'graph neural network': ['gnn', 'graph neural networks', 'graph convolution'],
  'reinforcement learning': ['rl', 'deep reinforcement learning'],
  'natural language processing': ['nlp', 'text mining'],
  'machine learning': ['ml', 'deep learning', 'dl'],
};

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEvidenceUrl(mapped = {}, source = '') {
  const raw = String(mapped.original_url || mapped.url || '').trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    const doi = normalizeDoi(raw);
    if (doi) return `https://doi.org/${doi}`;
  }

  const doi = normalizeDoi(mapped.doi || '');
  if (doi) return `https://doi.org/${doi}`;

  if (source === 'OpenAlex' && mapped.sources?.[0]?.external_id) {
    const externalId = String(mapped.sources[0].external_id).trim();
    if (/^https?:\/\//i.test(externalId)) return externalId;
  }

  return '';
}

function getOpenAlexService() {
  return require('./openalex.service');
}

function getCrossrefService() {
  return require('./crossref.service');
}

function getArxivService() {
  return require('./arxiv.service');
}

function getSemanticScholarService() {
  return require('./semanticScholar.service');
}

function getExaService() {
  return require('./exa.service');
}

function expandAlias(term) {
  const normalized = normalizeToken(term)
    .split(' ')
    .filter((token, index, arr) => token && token !== arr[index - 1])
    .join(' ');
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (normalized === canonical || aliases.includes(normalized)) return canonical;
  }
  return normalized;
}

function extractTerms(paper, topicTerms = []) {
  const bag = [
    paper.title,
    paper.abstract,
    ...(paper.keywords || []),
    ...(paper.fields || []),
  ].join(' ');

  const normalized = normalizeToken(bag);
  const terms = new Set();

  // Prefer multi-word aliases / topic phrases first.
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const variants = [canonical, ...aliases];
    if (variants.some((variant) => normalized.includes(variant))) {
      terms.add(canonical);
    }
  }
  for (const topicTerm of topicTerms) {
    if (topicTerm && normalized.includes(topicTerm)) terms.add(topicTerm);
  }

  const tokens = normalized.split(' ').filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
  for (let i = 0; i < tokens.length; i += 1) {
    const unigram = expandAlias(tokens[i]);
    if (unigram && !STOP_WORDS.has(unigram)) terms.add(unigram);
    if (i + 1 < tokens.length) {
      const bigram = expandAlias(`${tokens[i]} ${tokens[i + 1]}`);
      if (bigram.includes(' ') && !STOP_WORDS.has(bigram)) terms.add(bigram);
    }
  }

  return [...terms]
    .filter((term) => {
      if (!term || STOP_WORDS.has(term)) return false;
      // Drop unigrams that are already covered by a retained multi-word phrase.
      if (!term.includes(' ')) {
        const covered = [...terms].some((other) => other.includes(' ') && other.split(' ').includes(term));
        if (covered) return false;
      }
      return true;
    })
    .slice(0, 10);
}

function parseTopicTerms(topic) {
  const normalized = normalizeToken(topic);
  const terms = new Set();
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const variants = [canonical, ...aliases];
    if (variants.some((variant) => normalized.includes(variant))) terms.add(canonical);
  }
  const tokens = normalized.split(' ').filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  if (tokens.length >= 2) terms.add(expandAlias(tokens.join(' ')));
  for (const token of tokens) terms.add(expandAlias(token));
  return [...terms].filter(Boolean);
}

function toLivePaper(mapped, source) {
  const authors = Array.isArray(mapped.authors)
    ? mapped.authors.map((author) => (typeof author === 'string' ? author : author?.name)).filter(Boolean)
    : [];
  const externalId = mapped.sources?.[0]?.external_id || mapped.doi || mapped.original_url || mapped.title;
  return {
    id: String(externalId || normalizeToken(mapped.title)),
    title: mapped.title || 'Untitled paper',
    abstract: mapped.abstract || '',
    year: mapped.publication_year || null,
    source,
    doi: mapped.doi || undefined,
    url: normalizeEvidenceUrl(mapped, source) || undefined,
    authors,
    keywords: mapped.keywords || [],
    fields: mapped.research_fields || [],
    citationCount: mapped.citation_count || 0,
    type: mapped.type || 'Other',
  };
}

function dedupeLivePapers(papers) {
  const seen = new Set();
  const out = [];
  for (const paper of papers) {
    const key = normalizeToken(paper.doi || paper.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(paper);
  }
  return out;
}

async function fetchFromSource(sourceName, payload) {
  const options = {
    yearFrom: payload.yearFrom,
    yearTo: payload.yearTo,
    page: 1,
  };
  const limit = payload.maxRecordsPerSource;

  if (sourceName === 'OpenAlex') {
    const { fetchOpenAlexWorks, mapWorkToPaper } = getOpenAlexService();
    const { works } = await fetchOpenAlexWorks(payload.topic, limit, options);
    return works.map((work) => toLivePaper(mapWorkToPaper(work), 'OpenAlex'));
  }
  if (sourceName === 'Crossref') {
    const { fetchCrossrefWorks, mapItemToPaper } = getCrossrefService();
    const { items } = await fetchCrossrefWorks(payload.topic, limit, options);
    return items.map((item) => toLivePaper(mapItemToPaper(item), 'Crossref'));
  }
  if (sourceName === 'arXiv') {
    const { fetchArxivPapers, mapEntryToPaper } = getArxivService();
    const { entries } = await fetchArxivPapers(payload.topic, limit, options);
    return entries.map((entry) => toLivePaper(mapEntryToPaper(entry), 'arXiv'));
  }
  if (sourceName === 'Semantic Scholar') {
    const { fetchSemanticScholarPapers, mapSemanticPaperToPaper } = getSemanticScholarService();
    const { papers } = await fetchSemanticScholarPapers(payload.topic, limit, options);
    return papers.map((paper) => toLivePaper(mapSemanticPaperToPaper(paper), 'Semantic Scholar'));
  }
  if (sourceName === 'Exa') {
    const { fetchExaResults, mapResultToPaper } = getExaService();
    const { results } = await fetchExaResults(payload.topic, Math.min(limit, 25), options);
    return results.map((result) => toLivePaper(mapResultToPaper(result), 'Exa'));
  }
  throw new Error(`Unsupported source: ${sourceName}`);
}

async function fetchLivePapers(payload) {
  const sources = payload.sources?.length ? payload.sources : DEFAULT_SOURCES;
  const topicTerms = parseTopicTerms(payload.topic);
  const queries = [payload.topic];
  for (const term of topicTerms.filter((item) => item.includes(' ')).slice(0, 2)) {
    if (!queries.some((query) => normalizeToken(query) === term)) queries.push(term);
  }

  const sourceErrors = [];
  const batches = await Promise.all(sources.flatMap((source) => (
    queries.map(async (query) => {
      try {
        const papers = await fetchFromSource(source, { ...payload, topic: query });
        return { source, papers };
      } catch (err) {
        sourceErrors.push({
          source,
          message: `${query}: ${err.message || 'Source fetch failed'}`,
        });
        return { source, papers: [] };
      }
    })
  )));

  // Deduplicate source errors by source+message
  const uniqueErrors = [];
  const seenErrors = new Set();
  for (const row of sourceErrors) {
    const key = `${row.source}|${row.message}`;
    if (seenErrors.has(key)) continue;
    seenErrors.add(key);
    uniqueErrors.push(row);
  }

  const papers = dedupeLivePapers(batches.flatMap((batch) => batch.papers));
  return {
    sources,
    papers,
    sourceErrors: uniqueErrors,
    sourceCount: new Set(batches.filter((batch) => batch.papers.length > 0).map((batch) => batch.source)).size,
  };
}

function buildWarnings(payload, papers, sourceErrors) {
  const warnings = [];
  const topic = normalizeToken(payload.topic);
  if (topic.length <= 3 || ['ai', 'ml', 'data', 'learning'].includes(topic)) {
    warnings.push('Topic khá rộng. Kết quả có thể mang tính tham khảo.');
  }
  if (papers.length < 20) {
    warnings.push('Dữ liệu còn ít, kết quả chỉ mang tính tham khảo.');
  }
  if (sourceErrors.length) {
    warnings.push(`Một số nguồn lỗi: ${sourceErrors.map((row) => row.source).join(', ')}.`);
  }
  return warnings;
}

module.exports = {
  DEFAULT_SOURCES,
  STOP_WORDS,
  ALIASES,
  normalizeToken,
  expandAlias,
  extractTerms,
  parseTopicTerms,
  toLivePaper,
  dedupeLivePapers,
  fetchFromSource,
  fetchLivePapers,
  buildWarnings,
};
