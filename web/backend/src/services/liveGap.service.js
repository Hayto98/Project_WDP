const { fetchOpenAlexWorks, mapWorkToPaper } = require('./openalex.service');
const { fetchCrossrefWorks, mapItemToPaper } = require('./crossref.service');
const { fetchArxivPapers, mapEntryToPaper } = require('./arxiv.service');
const { fetchSemanticScholarPapers, mapSemanticPaperToPaper } = require('./semanticScholar.service');
const { fetchExaResults, mapResultToPaper } = require('./exa.service');
const AnalysisReport = require('../models/AnalysisReport');

const DEFAULT_SOURCES = ['OpenAlex', 'Crossref', 'arXiv'];
const EXPECTED_FACTOR = 0.25;
const STRONG_TOPIC_COUNT = 100;
const CACHE_TTL_MS = 20 * 60 * 1000;

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

const liveGapCache = new Map();

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugifyPair(a, b) {
  return `${a.replace(/\s+/g, '-')}__${b.replace(/\s+/g, '-')}`;
}

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    url: mapped.original_url || undefined,
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
    const { works } = await fetchOpenAlexWorks(payload.topic, limit, options);
    return works.map((work) => toLivePaper(mapWorkToPaper(work), 'OpenAlex'));
  }
  if (sourceName === 'Crossref') {
    const { items } = await fetchCrossrefWorks(payload.topic, limit, options);
    return items.map((item) => toLivePaper(mapItemToPaper(item), 'Crossref'));
  }
  if (sourceName === 'arXiv') {
    const { entries } = await fetchArxivPapers(payload.topic, limit, options);
    return entries.map((entry) => toLivePaper(mapEntryToPaper(entry), 'arXiv'));
  }
  if (sourceName === 'Semantic Scholar') {
    const { papers } = await fetchSemanticScholarPapers(payload.topic, limit, options);
    return papers.map((paper) => toLivePaper(mapSemanticPaperToPaper(paper), 'Semantic Scholar'));
  }
  if (sourceName === 'Exa') {
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

function buildTermAndPairStats(papers, topicTerms) {
  const termCounts = new Map();
  const pairCounts = new Map();
  const pairPapers = new Map();
  const recentYear = Math.max(...papers.map((paper) => paper.year || 0), new Date().getFullYear());
  const recentFrom = recentYear - 1;
  const oldTo = recentYear - 3;
  const oldFrom = recentYear - 5;

  for (const paper of papers) {
    const terms = extractTerms(paper, topicTerms);
    const uniqueTerms = [...new Set(terms)].sort();
    for (const term of uniqueTerms) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
    for (let i = 0; i < uniqueTerms.length; i += 1) {
      for (let j = i + 1; j < uniqueTerms.length; j += 1) {
        const a = uniqueTerms[i];
        const b = uniqueTerms[j];
        const key = `${a}||${b}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        if (!pairPapers.has(key)) pairPapers.set(key, []);
        pairPapers.get(key).push(paper);
      }
    }
  }

  return { termCounts, pairCounts, pairPapers, recentFrom, oldFrom, oldTo };
}

function buildCandidates(stats, topicTerms, topK) {
  const { termCounts, pairCounts, pairPapers, recentFrom, oldFrom, oldTo } = stats;
  const candidates = [];

  for (const [key, directCount] of pairCounts.entries()) {
    const [termA, termB] = key.split('||');
    const countA = termCounts.get(termA) || 0;
    const countB = termCounts.get(termB) || 0;
    const relatedToTopic = topicTerms.some((term) => term === termA || term === termB
      || termA.includes(term) || termB.includes(term) || term.includes(termA) || term.includes(termB));

    if (directCount < 2 && !relatedToTopic) continue;
    if (countA < 3 && countB < 3 && !relatedToTopic) continue;
    if (STOP_WORDS.has(termA) || STOP_WORDS.has(termB)) continue;

    const evidencePapers = pairPapers.get(key) || [];
    const recentDirectCount = evidencePapers.filter((paper) => (paper.year || 0) >= recentFrom).length;
    const oldDirectCount = evidencePapers.filter((paper) => {
      const year = paper.year || 0;
      return year >= oldFrom && year <= oldTo;
    }).length;

    candidates.push({
      id: slugifyPair(termA, termB),
      field: titleCase(termA),
      aspect: titleCase(termB),
      termA,
      termB,
      directCount,
      countA,
      countB,
      recentDirectCount,
      oldDirectCount,
      evidencePapers,
    });
  }

  // Prefer candidates touching the user topic, then by scarcity signal.
  return candidates
    .sort((a, b) => {
      const aTopic = topicTerms.some((term) => a.termA === term || a.termB === term) ? 1 : 0;
      const bTopic = topicTerms.some((term) => b.termA === term || b.termB === term) ? 1 : 0;
      if (bTopic !== aTopic) return bTopic - aTopic;
      return (b.countA + b.countB) - (a.countA + a.countB);
    })
    .slice(0, Math.max(topK * 4, 40));
}

function scoreCandidate(candidate, context) {
  const {
    directCount,
    countA,
    countB,
    recentDirectCount,
    oldDirectCount,
  } = candidate;

  const expectedCount = Math.max(1, Math.sqrt(countA * countB) * EXPECTED_FACTOR);
  const scarcityScore = clamp01(1 - Math.min(directCount / expectedCount, 1));
  const growthRate = ((recentDirectCount + 1) / (oldDirectCount + 1)) - 1;
  const growthScore = clamp01(growthRate / 2);
  const adjacencyScore = Math.sqrt(clamp01(countA / STRONG_TOPIC_COUNT) * clamp01(countB / STRONG_TOPIC_COUNT));
  const noveltyScore = clamp01(recentDirectCount / Math.max(directCount, 1));
  const sourceDiversityScore = clamp01(context.sourceCount / 3);
  const fetchedScore = clamp01(context.totalFetched / 100);
  const evidenceScore = 0.7 * fetchedScore + 0.3 * sourceDiversityScore;

  const weighted =
    0.35 * scarcityScore +
    0.25 * growthScore +
    0.20 * adjacencyScore +
    0.10 * noveltyScore +
    0.10 * evidenceScore;

  const gapScore = Math.round(weighted * 100);
  let level = 'unclear';
  if (gapScore >= 80) level = 'strong';
  else if (gapScore >= 60) level = 'potential';
  else if (gapScore >= 40) level = 'needs_data';

  let confidence = 'low';
  if (context.totalFetched >= 80 && directCount >= 4) confidence = 'high';
  else if (context.totalFetched >= 40 && directCount >= 2) confidence = 'medium';
  if (context.totalFetched < 20) confidence = 'low';

  const reasons = [];
  if (adjacencyScore >= 0.45) {
    reasons.push(`${titleCase(candidate.termA)} và ${titleCase(candidate.termB)} đều có tín hiệu nghiên cứu riêng khá rõ.`);
  }
  if (scarcityScore >= 0.45) {
    reasons.push('Số paper kết hợp trực tiếp thấp hơn mức kỳ vọng từ độ mạnh của từng chủ đề.');
  }
  if (noveltyScore >= 0.5) {
    reasons.push('Đa số paper kết hợp xuất hiện trong giai đoạn gần đây.');
  }
  if (growthScore >= 0.4) {
    reasons.push('Có tín hiệu tăng trưởng gần đây cho cặp chủ đề này.');
  }
  if (!reasons.length) {
    reasons.push('Cặp chủ đề này có tín hiệu gap ở mức tham khảo, cần thêm dữ liệu để khẳng định.');
  }

  const evidence = (candidate.evidencePapers || [])
    .slice()
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, 5)
    .map((paper) => ({
      title: paper.title,
      year: paper.year,
      source: paper.source,
      doi: paper.doi,
      url: paper.url,
      citationCount: paper.citationCount || 0,
    }));

  return {
    id: candidate.id,
    field: candidate.field,
    aspect: candidate.aspect,
    gapScore,
    level,
    confidence,
    metrics: {
      directCount,
      countA,
      countB,
      expectedCount: Number(expectedCount.toFixed(1)),
      recentDirectCount,
      oldDirectCount,
      growthRate: Number(growthRate.toFixed(3)),
      scarcityScore: Number(scarcityScore.toFixed(3)),
      growthScore: Number(growthScore.toFixed(3)),
      adjacencyScore: Number(adjacencyScore.toFixed(3)),
      noveltyScore: Number(noveltyScore.toFixed(3)),
      evidenceScore: Number(evidenceScore.toFixed(3)),
    },
    reasons,
    evidence,
  };
}

function cacheKey(payload) {
  return [
    normalizeToken(payload.topic),
    (payload.sources || DEFAULT_SOURCES).join(','),
    payload.yearFrom,
    payload.yearTo,
    payload.maxRecordsPerSource,
    payload.topK,
  ].join('|');
}

function getCached(key) {
  const hit = liveGapCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    liveGapCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  liveGapCache.set(key, { at: Date.now(), value });
}

function buildWarnings(payload, papers, sourceErrors) {
  const warnings = [];
  const topic = normalizeToken(payload.topic);
  if (topic.length <= 3 || ['ai', 'ml', 'data', 'learning'].includes(topic)) {
    warnings.push('Topic khá rộng. Hãy nhập cụ thể hơn để gap score đáng tin hơn.');
  }
  if (papers.length < 20) {
    warnings.push('Dữ liệu còn ít, kết quả gap chỉ mang tính tham khảo.');
  }
  if (sourceErrors.length) {
    warnings.push(`Một số nguồn lỗi: ${sourceErrors.map((row) => row.source).join(', ')}.`);
  }
  return warnings;
}

async function getLiveGaps(payload) {
  const topic = String(payload.topic || '').trim();
  if (!topic) {
    throw Object.assign(new Error('Topic is required'), { statusCode: 400 });
  }

  const normalizedPayload = {
    topic,
    sources: payload.sources?.length ? payload.sources : DEFAULT_SOURCES,
    yearFrom: payload.yearFrom || 2021,
    yearTo: payload.yearTo || new Date().getFullYear(),
    maxRecordsPerSource: payload.maxRecordsPerSource || 50,
    topK: payload.topK || 12,
  };

  const key = cacheKey(normalizedPayload);
  const cached = getCached(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  const fetched = await fetchLivePapers(normalizedPayload);
  const topicTerms = parseTopicTerms(topic);
  const stats = buildTermAndPairStats(fetched.papers, topicTerms);
  const candidates = buildCandidates(stats, topicTerms, normalizedPayload.topK);
  const context = {
    totalFetched: fetched.papers.length,
    sourceCount: fetched.sourceCount,
  };

  const gaps = candidates
    .map((candidate) => scoreCandidate(candidate, context))
    .filter((gap) => gap.gapScore >= 40)
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, normalizedPayload.topK);

  const summary = {
    strongGaps: gaps.filter((gap) => gap.level === 'strong').length,
    potentialGaps: gaps.filter((gap) => gap.level === 'potential').length,
    lowConfidence: gaps.filter((gap) => gap.confidence === 'low' || gap.level === 'needs_data').length,
  };

  const response = {
    topic,
    mode: 'live',
    sources: fetched.sources,
    yearFrom: normalizedPayload.yearFrom,
    yearTo: normalizedPayload.yearTo,
    totalFetched: fetched.papers.length,
    generatedAt: new Date().toISOString(),
    summary,
    gaps,
    sourceErrors: fetched.sourceErrors,
    warnings: buildWarnings(normalizedPayload, fetched.papers, fetched.sourceErrors),
    cached: false,
  };

  setCached(key, response);
  return response;
}

async function saveLiveGapReport(result, userId = null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const doc = await AnalysisReport.create({
    report_type: 'CustomSearch',
    criteria: {
      mode: 'live',
      topic: result.topic,
      sources: result.sources,
      yearFrom: result.yearFrom,
      yearTo: result.yearTo,
      requested_by: userId || null,
    },
    result_snapshot: result,
    generated_at: now,
    expires_at: expiresAt,
  });
  return {
    id: String(doc._id),
    reportType: doc.report_type,
    generatedAt: doc.generated_at,
  };
}

module.exports = {
  getLiveGaps,
  saveLiveGapReport,
  scoreCandidate,
  extractTerms,
  parseTopicTerms,
  dedupeLivePapers,
  clamp01,
};
