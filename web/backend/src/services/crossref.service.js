const Paper = require('../models/Paper');
const { sources: sourceConfig } = require('../config/env');
const { findOriginalAbstractWithLlm } = require('./abstract.service');

function normalizeTitle(title) {
  return String(title || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function clampMaxRecords(value) {
  const parsed = parseInt(value, 10) || 25;
  return Math.max(1, Math.min(parsed, 50));
}

function stripMarkup(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstArrayValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFallbackAbstract(item) {
  return [
    firstArrayValue(item.subtitle),
    firstArrayValue(item['container-title']),
    Array.isArray(item.subject) && item.subject.length ? `Subjects: ${item.subject.slice(0, 4).join(', ')}` : '',
  ].filter(Boolean).join('. ');
}

function getYear(item) {
  const dateParts = item.published?.['date-parts']
    || item['published-print']?.['date-parts']
    || item['published-online']?.['date-parts']
    || item.created?.['date-parts'];
  return Number(dateParts?.[0]?.[0]) || new Date().getFullYear();
}

function getMonth(item) {
  const dateParts = item.published?.['date-parts']
    || item['published-print']?.['date-parts']
    || item['published-online']?.['date-parts']
    || item.created?.['date-parts'];
  return Number(dateParts?.[0]?.[1]) || undefined;
}

function mapType(item) {
  const raw = String(item.type || '').toLowerCase();
  if (raw.includes('journal')) return 'Journal';
  if (raw.includes('proceedings') || raw.includes('conference')) return 'Conference';
  return 'Preprint';
}

function mapAuthors(item) {
  return (item.author || [])
    .map((author, index) => ({
      name: [author.given, author.family].filter(Boolean).join(' ') || author.name,
      is_primary: index === 0,
    }))
    .filter((author) => author.name);
}

function mapItemToPaper(item) {
  const title = stripMarkup(firstArrayValue(item.title) || 'Untitled Crossref work');
  const subjects = Array.isArray(item.subject) ? item.subject : [];
  const year = getYear(item);

  return {
    doi: item.DOI || undefined,
    title,
    title_normalized: normalizeTitle(title),
    abstract: stripMarkup(item.abstract || buildFallbackAbstract(item)),
    publication_year: year,
    publication_month: getMonth(item),
    source_name: 'Crossref',
    type: mapType(item),
    status: 'Cleaned',
    citation_count: Number(item['is-referenced-by-count'] || 0),
    original_url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : 'https://www.crossref.org/'),
    authors: mapAuthors(item),
    keywords: subjects.slice(0, 6),
    research_fields: subjects.slice(0, 3),
    sources: [{
      source_name: 'Crossref',
      external_id: item.DOI || item.URL || normalizeTitle(title),
      fetched_at: new Date(),
    }],
  };
}

function buildFilters(options = {}) {
  const filters = [];
  const yearFrom = parseInt(options.yearFrom, 10);
  const yearTo = parseInt(options.yearTo, 10);
  const types = String(options.types || '').split(',').map((type) => type.trim()).filter(Boolean);

  if (yearFrom) filters.push(`from-pub-date:${yearFrom}-01-01`);
  if (yearTo) filters.push(`until-pub-date:${yearTo}-12-31`);
  if (types.includes('Journal')) filters.push('type:journal-article');
  if (types.includes('Conference')) filters.push('type:proceedings-article');
  if (types.includes('Preprint')) filters.push('type:posted-content');

  return filters.join(',');
}

async function fetchCrossrefWorks(query, maxRecords = 25, options = {}) {
  const rows = clampMaxRecords(maxRecords);
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query', query);
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('offset', String((page - 1) * rows));
  const filter = buildFilters(options);
  if (filter) url.searchParams.set('filter', filter);
  if (sourceConfig.crossrefMailto) url.searchParams.set('mailto', sourceConfig.crossrefMailto);

  const res = await fetch(url);
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw Object.assign(new Error(body.message || body.raw || `Crossref HTTP ${res.status}`), {
      statusCode: res.status,
    });
  }

  return {
    total: body.message?.['total-results'] || 0,
    items: Array.isArray(body.message?.items) ? body.message.items : [],
  };
}

async function importCrossrefByQuery(query, maxRecords = 25, options = {}) {
  const { total, items } = await fetchCrossrefWorks(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const paper = mapItemToPaper(item);
    if (!paper.title_normalized) {
      skipped += 1;
      continue;
    }
    if (!paper.abstract) {
      paper.abstract = await findOriginalAbstractWithLlm(paper);
    }

    const existing = await Paper.findOne({
      $or: [
        ...(paper.doi ? [{ doi: paper.doi }] : []),
        { title_normalized: paper.title_normalized, publication_year: paper.publication_year },
      ],
    });

    if (existing) {
      const hasCrossrefSource = existing.sources?.some((source) => source.source_name === 'Crossref');
      if (!hasCrossrefSource) {
        existing.sources.push(paper.sources[0]);
        existing.keywords = Array.from(new Set([...(existing.keywords || []), ...paper.keywords]));
        existing.research_fields = Array.from(new Set([...(existing.research_fields || []), ...paper.research_fields]));
        await existing.save();
        imported += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await Paper.create(paper);
    imported += 1;
  }

  return {
    imported,
    skipped,
    sourceTotal: total,
  };
}

module.exports = {
  fetchCrossrefWorks,
  importCrossrefByQuery,
};
