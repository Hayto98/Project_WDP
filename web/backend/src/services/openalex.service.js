const { sources: sourceConfig } = require('../config/env');
const { findOriginalAbstractWithLlm } = require('./abstract.service');
const { normalizeDoi, normalizeTitle, upsertCleanPaper } = require('./paperCleaning.service');


function clampMaxRecords(value) {
  const parsed = parseInt(value, 10) || 25;
  return Math.max(1, Math.min(parsed, 50));
}

function decodeAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const entries = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) entries[position] = word;
  }
  return entries.filter(Boolean).join(' ');
}

function mapType(work) {
  const raw = String(work.type_crossref || work.type || '').toLowerCase();
  if (raw.includes('journal') || raw === 'article') return 'Journal';
  if (raw.includes('proceedings') || raw.includes('conference')) return 'Conference';
  return 'Preprint';
}

function mapConcepts(work) {
  const concepts = Array.isArray(work.concepts) ? work.concepts : [];
  return concepts
    .filter((concept) => concept?.display_name)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((concept) => concept.display_name);
}

function mapAuthors(work) {
  return (work.authorships || [])
    .map((authorship, index) => ({
      name: authorship.author?.display_name,
      is_primary: index === 0,
    }))
    .filter((author) => author.name);
}

function mapWorkToPaper(work) {
  const concepts = mapConcepts(work);
  const doi = normalizeDoi(work.doi);
  return {
    doi: doi || undefined,
    title: work.title || work.display_name || 'Untitled OpenAlex work',
    title_normalized: normalizeTitle(work.title || work.display_name),
    abstract: decodeAbstract(work.abstract_inverted_index),
    publication_year: Number(work.publication_year) || new Date().getFullYear(),
    publication_month: work.publication_date ? Number(String(work.publication_date).slice(5, 7)) || undefined : undefined,
    source_name: 'OpenAlex',
    type: mapType(work),
    status: 'Cleaned',
    citation_count: Number(work.cited_by_count || 0),
    original_url: work.primary_location?.landing_page_url || work.doi || work.id || 'https://openalex.org/',
    authors: mapAuthors(work),
    keywords: concepts.slice(0, 6),
    research_fields: concepts.slice(0, 3),
    sources: [{
      source_name: 'OpenAlex',
      external_id: work.id || work.openalex_id || normalizeTitle(work.title),
      fetched_at: new Date(),
    }],
  };
}

function buildOpenAlexFilters(options = {}) {
  const filters = [];
  const yearFrom = parseInt(options.yearFrom, 10);
  const yearTo = parseInt(options.yearTo, 10);
  const types = String(options.types || '')
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean);

  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`);
  if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`);
  if (types.includes('Journal')) filters.push('type:article');
  if (types.includes('Conference')) filters.push('type:proceedings-article');
  if (types.includes('Preprint')) filters.push('type:preprint');

  return filters.join(',');
}

async function fetchOpenAlexWorks(query, maxRecords = 25, options = {}) {
  const cleaned = String(query || '').trim().replace(/^"+|"+$/g, '').trim();
  const searchQuery = /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
  const url = new URL('/works', sourceConfig.openAlexApiUrl);
  url.searchParams.set('search', searchQuery);
  url.searchParams.set('per-page', String(clampMaxRecords(maxRecords)));
  if (options.page) url.searchParams.set('page', String(Math.max(1, parseInt(options.page, 10) || 1)));
  const filter = buildOpenAlexFilters(options);
  if (filter) url.searchParams.set('filter', filter);
  if (sourceConfig.openAlexMailto) url.searchParams.set('mailto', sourceConfig.openAlexMailto);

  const res = await fetch(url);
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw Object.assign(new Error(body.error || body.message || body.raw || `OpenAlex HTTP ${res.status}`), {
      statusCode: res.status,
    });
  }

  return {
    total: body.meta?.count || 0,
    works: Array.isArray(body.results) ? body.results : [],
  };
}

async function importOpenAlexByQuery(query, maxRecords = 25, options = {}) {
  const { total, works } = await fetchOpenAlexWorks(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const work of works) {
    const paper = mapWorkToPaper(work);
    if (!paper.title_normalized) {
      skipped += 1;
      continue;
    }
    if (!paper.abstract) {
      paper.abstract = await findOriginalAbstractWithLlm(paper);
    }

    const outcome = await upsertCleanPaper(paper);
    if (outcome.imported) imported += 1;
    if (outcome.skipped) skipped += 1;
  }

  return {
    imported,
    skipped,
    sourceTotal: total,
  };
}

module.exports = {
  importOpenAlexByQuery,
  fetchOpenAlexWorks,
  mapWorkToPaper,
};
