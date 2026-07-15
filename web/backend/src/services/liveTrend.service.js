const liveFetch = require('./liveFetch.service');
const {
  DEFAULT_SOURCES,
  extractTerms,
  parseTopicTerms,
  buildWarnings,
  normalizeToken,
} = liveFetch;
const AnalysisReport = require('../models/AnalysisReport');

const CACHE_TTL_MS = 20 * 60 * 1000;
const liveTrendCache = new Map();

function cacheKey(payload) {
  return [
    normalizeToken(payload.topic),
    (payload.sources || DEFAULT_SOURCES).join(','),
    payload.yearFrom,
    payload.yearTo,
    payload.maxRecordsPerSource,
  ].join('|');
}

function getCached(key) {
  const hit = liveTrendCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    liveTrendCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  liveTrendCache.set(key, { at: Date.now(), value });
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildTrendData(papers, topicTerms, yearFrom, yearTo) {
  // First, identify the most common terms across all papers
  const termCounts = new Map();
  for (const paper of papers) {
    const terms = extractTerms(paper, topicTerms);
    for (const term of new Set(terms)) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  }

  // Get top 5 terms to show as trend lines
  const topTerms = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  // Group by year and count terms
  const yearData = new Map();
  for (let year = yearFrom; year <= yearTo; year += 1) {
    const initData = { period: String(year) };
    for (const term of topTerms) {
      initData[titleCase(term)] = 0;
    }
    yearData.set(year, initData);
  }

  for (const paper of papers) {
    const year = paper.year;
    if (year >= yearFrom && year <= yearTo && yearData.has(year)) {
      const terms = new Set(extractTerms(paper, topicTerms));
      const yearRecord = yearData.get(year);
      for (const term of topTerms) {
        if (terms.has(term)) {
          yearRecord[titleCase(term)] += 1;
        }
      }
    }
  }

  return Array.from(yearData.values());
}

async function getLiveTrends(payload) {
  const topic = String(payload.topic || '').trim();
  if (!topic) {
    throw Object.assign(new Error('Topic is required'), { statusCode: 400 });
  }

  const currentYear = new Date().getFullYear();
  const normalizedPayload = {
    topic,
    sources: payload.sources?.length ? payload.sources : DEFAULT_SOURCES,
    yearFrom: payload.yearFrom || (currentYear - 5),
    yearTo: payload.yearTo || currentYear,
    maxRecordsPerSource: payload.maxRecordsPerSource || 50,
  };

  const key = cacheKey(normalizedPayload);
  const cached = getCached(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  const fetched = await liveFetch.fetchLivePapers(normalizedPayload);
  const topicTerms = parseTopicTerms(topic);
  
  const trendPoints = buildTrendData(
    fetched.papers, 
    topicTerms, 
    normalizedPayload.yearFrom, 
    normalizedPayload.yearTo
  );

  const response = {
    topic,
    mode: 'live_trend',
    sources: fetched.sources,
    yearFrom: normalizedPayload.yearFrom,
    yearTo: normalizedPayload.yearTo,
    totalFetched: fetched.papers.length,
    generatedAt: new Date().toISOString(),
    trendPoints,
    sourceErrors: fetched.sourceErrors,
    warnings: buildWarnings(normalizedPayload, fetched.papers, fetched.sourceErrors),
    cached: false,
  };

  setCached(key, response);
  return response;
}

async function saveLiveTrendReport(result, userId = null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const doc = await AnalysisReport.create({
    report_type: 'CustomSearch',
    criteria: {
      mode: 'live_trend',
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
  getLiveTrends,
  saveLiveTrendReport,
};
