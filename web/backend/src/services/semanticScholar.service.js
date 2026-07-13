const { sources: sourceConfig } = require('../config/env');
const {
  cleanText,
  normalizeDoi,
  normalizeTitle,
  uniqueStrings,
  upsertCleanPaper,
} = require('./paperCleaning.service');

function clampMaxRecords(value) {
  const parsed = parseInt(value, 10) || 25;
  return Math.max(1, Math.min(parsed, 50));
}

function mapType(paper) {
  const venue = `${paper.venue || ''} ${paper.publicationVenue?.type || ''}`.toLowerCase();
  if (venue.includes('conference') || venue.includes('proceedings')) return 'Conference';
  if (venue.includes('journal')) return 'Journal';
  return 'Preprint';
}

function mapFields(paper) {
  return uniqueStrings([
    ...(paper.fieldsOfStudy || []),
    ...(paper.s2FieldsOfStudy || []).map((field) => field.category || field.source),
    paper.publicationVenue?.name,
    paper.venue,
  ], 8);
}

function mapSemanticPaperToPaper(paper) {
  const fields = mapFields(paper);
  const title = cleanText(paper.title || 'Untitled Semantic Scholar paper', 500);
  const doi = normalizeDoi(paper.externalIds?.DOI || paper.doi || '');

  return {
    doi: doi || undefined,
    title,
    title_normalized: normalizeTitle(title),
    abstract: cleanText(paper.abstract || paper.tldr?.text || '', 5000),
    publication_year: Number(paper.year) || new Date().getFullYear(),
    source_name: 'Semantic Scholar',
    type: mapType(paper),
    status: 'Cleaned',
    citation_count: Number(paper.citationCount || 0),
    original_url: cleanText(paper.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : ''), 1000),
    authors: (paper.authors || []).map((author, index) => ({
      name: cleanText(author.name, 180),
      is_primary: index === 0,
    })).filter((author) => author.name),
    keywords: fields.slice(0, 6),
    research_fields: fields.slice(0, 3),
    sources: [{
      source_name: 'Semantic Scholar',
      external_id: cleanText(paper.paperId || doi || title, 500),
      fetched_at: new Date(),
    }],
  };
}

function buildSearchQuery(query, options = {}) {
  const cleaned = String(query || '').trim().replace(/^"+|"+$/g, '').trim();
  const phrase = /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
  const yearFrom = parseInt(options.yearFrom, 10);
  const yearTo = parseInt(options.yearTo, 10);
  if (!yearFrom && !yearTo) return phrase;
  return `${phrase} ${yearFrom || 1900}-${yearTo || new Date().getFullYear()}`;
}

async function fetchSemanticScholarPapers(query, maxRecords = 25, options = {}) {
  const url = new URL(`${String(sourceConfig.semanticScholarApiUrl).replace(/\/$/, '')}/paper/search`);
  url.searchParams.set('query', buildSearchQuery(query, options));
  url.searchParams.set('limit', String(clampMaxRecords(maxRecords)));
  url.searchParams.set('fields', [
    'paperId',
    'title',
    'abstract',
    'year',
    'authors',
    'citationCount',
    'venue',
    'publicationVenue',
    'fieldsOfStudy',
    's2FieldsOfStudy',
    'externalIds',
    'url',
    'tldr',
  ].join(','));

  const headers = {};
  if (sourceConfig.semanticScholarApiKey) headers['x-api-key'] = sourceConfig.semanticScholarApiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceConfig.externalApiTimeoutMs || 30000);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      throw Object.assign(new Error(body.message || body.error || body.raw || `Semantic Scholar HTTP ${res.status}`), {
        statusCode: res.status,
      });
    }

    return {
      total: body.total || body.data?.length || 0,
      papers: Array.isArray(body.data) ? body.data : [],
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('Semantic Scholar request timed out'), { statusCode: 504 });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function importSemanticScholarByQuery(query, maxRecords = 25, options = {}) {
  const { total, papers } = await fetchSemanticScholarPapers(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const item of papers) {
    const paper = mapSemanticPaperToPaper(item);
    const outcome = await upsertCleanPaper(paper);
    if (outcome.imported) imported += 1;
    if (outcome.skipped) skipped += 1;
  }

  return { imported, skipped, sourceTotal: total };
}

module.exports = {
  fetchSemanticScholarPapers,
  importSemanticScholarByQuery,
  mapSemanticPaperToPaper,
};
