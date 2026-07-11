const { findOriginalAbstractWithLlm } = require('./abstract.service');
const { normalizeTitle, upsertCleanPaper } = require('./paperCleaning.service');

function clampMaxRecords(value) {
  const parsed = parseInt(value, 10) || 25;
  return Math.max(1, Math.min(parsed, 50));
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(xml, pattern) {
  const match = xml.match(pattern);
  return match ? decodeXml(match[1]) : '';
}

function allMatches(xml, pattern) {
  return [...xml.matchAll(pattern)].map((match) => decodeXml(match[1])).filter(Boolean);
}

function buildSearchQuery(query, options = {}) {
  const parts = [`all:${query}`];
  const yearFrom = parseInt(options.yearFrom, 10);
  const yearTo = parseInt(options.yearTo, 10);

  if (yearFrom || yearTo) {
    const start = yearFrom || 1990;
    const end = yearTo || new Date().getFullYear();
    parts.push(`submittedDate:[${start}01010000 TO ${end}12312359]`);
  }

  return parts.join(' AND ');
}

function extractCategory(entryXml) {
  const match = entryXml.match(/<category[^>]*term="([^"]+)"/);
  return match ? decodeXml(match[1]) : 'arXiv';
}

function mapEntryToPaper(entryXml) {
  const id = firstMatch(entryXml, /<id>([\s\S]*?)<\/id>/);
  const published = firstMatch(entryXml, /<published>([\s\S]*?)<\/published>/);
  const title = firstMatch(entryXml, /<title>([\s\S]*?)<\/title>/);
  const summary = firstMatch(entryXml, /<summary>([\s\S]*?)<\/summary>/);
  const category = extractCategory(entryXml);
  const year = Number(String(published).slice(0, 4)) || new Date().getFullYear();
  const month = Number(String(published).slice(5, 7)) || undefined;

  return {
    title,
    title_normalized: normalizeTitle(title),
    abstract: summary,
    publication_year: year,
    publication_month: month,
    source_name: 'arXiv',
    type: 'Preprint',
    status: 'Cleaned',
    citation_count: 0,
    original_url: id || 'https://arxiv.org/',
    authors: allMatches(entryXml, /<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)
      .map((name, index) => ({ name, is_primary: index === 0 })),
    keywords: [category],
    research_fields: [category],
    sources: [{
      source_name: 'arXiv',
      external_id: id || normalizeTitle(title),
      fetched_at: new Date(),
    }],
  };
}

async function fetchArxivPapers(query, maxRecords = 25, options = {}) {
  const types = String(options.types || '').split(',').map((type) => type.trim()).filter(Boolean);
  if (types.length && !types.includes('Preprint')) {
    return { total: 0, entries: [] };
  }

  const url = new URL('https://export.arxiv.org/api/query');
  const perPage = clampMaxRecords(maxRecords);
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  url.searchParams.set('search_query', buildSearchQuery(query, options));
  url.searchParams.set('start', String((page - 1) * perPage));
  url.searchParams.set('max_results', String(perPage));
  url.searchParams.set('sortBy', 'relevance');
  url.searchParams.set('sortOrder', 'descending');

  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(text || `arXiv HTTP ${res.status}`), { statusCode: res.status });
  }

  const total = Number(firstMatch(text, /<opensearch:totalResults[^>]*>([\s\S]*?)<\/opensearch:totalResults>/)) || 0;
  const entries = [...text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
  return { total, entries };
}

async function importArxivByQuery(query, maxRecords = 25, options = {}) {
  const { total, entries } = await fetchArxivPapers(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const paper = mapEntryToPaper(entry);
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
  fetchArxivPapers,
  importArxivByQuery,
  mapEntryToPaper,
};
