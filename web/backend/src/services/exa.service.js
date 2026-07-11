const { sources: sourceConfig } = require('../config/env');
const {
  cleanText,
  normalizeDoi,
  normalizeTitle,
  uniqueStrings,
  upsertCleanPaper,
} = require('./paperCleaning.service');

function clampMaxRecords(value) {
  const parsed = parseInt(value, 10) || 10;
  return Math.max(1, Math.min(parsed, 25));
}

function getYear(result) {
  const date = result.publishedDate || result.published_date || result.date;
  const year = Number(String(date || '').slice(0, 4));
  return year || new Date().getFullYear();
}

function getMonth(result) {
  const date = result.publishedDate || result.published_date || result.date;
  const month = Number(String(date || '').slice(5, 7));
  return month || undefined;
}

function inferType(result) {
  const haystack = `${result.url || ''} ${result.title || ''}`.toLowerCase();
  if (haystack.includes('conference') || haystack.includes('proceedings')) return 'Conference';
  if (haystack.includes('journal') || haystack.includes('doi.org')) return 'Journal';
  return 'Preprint';
}

function extractDoi(result) {
  const url = String(result.url || '');
  const doiMatch = url.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return normalizeDoi(result.doi || doiMatch?.[0] || '');
}

function mapResultToPaper(result) {
  const title = cleanText(result.title || 'Untitled Exa result', 500);
  const highlights = Array.isArray(result.highlights) ? result.highlights : [];
  const text = cleanText(result.summary || result.text || highlights.join(' '), 5000);
  const author = cleanText(result.author || result.authorName || '', 180);
  const url = cleanText(result.url || result.id || '', 1000);
  const doi = extractDoi(result);
  const titleTokens = normalizeTitle(title)
    .split(' ')
    .filter((token) => token.length > 4 && !['using', 'based', 'study', 'research', 'paper'].includes(token));
  const keywords = uniqueStrings([...(result.keywords || []), ...titleTokens], 8);

  return {
    doi: doi || undefined,
    title,
    title_normalized: normalizeTitle(title),
    abstract: text,
    publication_year: getYear(result),
    publication_month: getMonth(result),
    source_name: 'Exa',
    type: inferType(result),
    status: 'Cleaned',
    citation_count: 0,
    original_url: url,
    authors: author ? [{ name: author, is_primary: true }] : [],
    keywords,
    research_fields: keywords.slice(0, 3),
    sources: [{
      source_name: 'Exa',
      external_id: cleanText(result.id || result.url || title, 500),
      fetched_at: new Date(),
    }],
  };
}

function buildQuery(query, options = {}) {
  const parts = [query];
  const yearFrom = parseInt(options.yearFrom, 10);
  const yearTo = parseInt(options.yearTo, 10);
  const types = String(options.types || '').split(',').map((type) => type.trim()).filter(Boolean);

  if (yearFrom || yearTo) parts.push(`${yearFrom || 1900}-${yearTo || new Date().getFullYear()}`);
  if (types.length) parts.push(types.join(' OR '));
  parts.push('academic paper research abstract');

  return parts.filter(Boolean).join(' ');
}

async function fetchExaResults(query, maxRecords = 10, options = {}) {
  if (!sourceConfig.exaApiKey) {
    throw Object.assign(new Error('EXA_API_KEY is not configured'), { statusCode: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sourceConfig.externalApiTimeoutMs || 30000);

  try {
    const res = await fetch(new URL('/search', sourceConfig.exaApiUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sourceConfig.exaApiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        query: buildQuery(query, options),
        numResults: clampMaxRecords(maxRecords),
        type: 'auto',
        contents: {
          text: { maxCharacters: 1200 },
          highlights: { numSentences: 3 },
        },
      }),
    });

    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      throw Object.assign(new Error(body.error || body.message || body.raw || `Exa HTTP ${res.status}`), {
        statusCode: res.status,
      });
    }

    return {
      total: Array.isArray(body.results) ? body.results.length : 0,
      results: Array.isArray(body.results) ? body.results : [],
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('Exa request timed out'), { statusCode: 504 });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function importExaByQuery(query, maxRecords = 10, options = {}) {
  const { total, results } = await fetchExaResults(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const result of results) {
    const paper = mapResultToPaper(result);
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
  fetchExaResults,
  importExaByQuery,
  mapResultToPaper,
};
