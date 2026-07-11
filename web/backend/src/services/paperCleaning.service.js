const Paper = require('../models/Paper');
const { notifyFollowersForPaper } = require('./follow.service');

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDoi(doiOrUrl = '') {
  const raw = String(doiOrUrl || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();
}

function cleanText(value = '', maxLength = 5000) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function uniqueStrings(values = [], limit = 12) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const cleaned = cleanText(value, 120);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  }

  return result;
}

function preparePaper(rawPaper) {
  const title = cleanText(rawPaper.title, 500);
  const publicationYear = Number(rawPaper.publication_year) || new Date().getFullYear();
  const doi = normalizeDoi(rawPaper.doi);
  const titleNormalized = normalizeTitle(rawPaper.title_normalized || title);

  return {
    ...rawPaper,
    doi: doi || undefined,
    title,
    title_normalized: titleNormalized,
    abstract: cleanText(rawPaper.abstract, 5000),
    publication_year: publicationYear,
    publication_month: rawPaper.publication_month ? Number(rawPaper.publication_month) : undefined,
    citation_count: Math.max(0, Number(rawPaper.citation_count || 0)),
    original_url: cleanText(rawPaper.original_url, 1000),
    authors: Array.isArray(rawPaper.authors)
      ? rawPaper.authors
        .map((author, index) => ({
          name: cleanText(author.name || author, 180),
          is_primary: Boolean(author.is_primary ?? index === 0),
        }))
        .filter((author) => author.name)
      : [],
    keywords: uniqueStrings(rawPaper.keywords || [], 8),
    research_fields: uniqueStrings(rawPaper.research_fields || [], 5),
    sources: Array.isArray(rawPaper.sources) ? rawPaper.sources : [],
    status: title && titleNormalized ? 'Cleaned' : 'Rejected',
  };
}

async function upsertCleanPaper(rawPaper) {
  const paper = preparePaper(rawPaper);
  if (paper.status === 'Rejected' || !paper.original_url) {
    return { imported: false, skipped: true, reason: 'invalid_record' };
  }

  const existing = await Paper.findOne({
    $or: [
      ...(paper.doi ? [{ doi: paper.doi }] : []),
      { title_normalized: paper.title_normalized, publication_year: paper.publication_year },
    ],
  });

  if (existing) {
    const incomingSource = paper.sources?.[0];
    const hasSource = incomingSource
      && existing.sources?.some((source) => (
        source.source_name === incomingSource.source_name
        && source.external_id === incomingSource.external_id
      ));

    if (incomingSource && !hasSource) {
      existing.sources.push(incomingSource);
      existing.keywords = uniqueStrings([...(existing.keywords || []), ...paper.keywords], 12);
      existing.research_fields = uniqueStrings([...(existing.research_fields || []), ...paper.research_fields], 8);
      if (!existing.abstract && paper.abstract) existing.abstract = paper.abstract;
      await existing.save();
      await notifyFollowersForPaper(existing);
      return { imported: true, skipped: false, merged: true };
    }

    return { imported: false, skipped: true, reason: 'duplicate' };
  }

  const created = await Paper.create(paper);
  await notifyFollowersForPaper(created);
  return { imported: true, skipped: false, merged: false };
}

module.exports = {
  cleanText,
  normalizeDoi,
  normalizeTitle,
  preparePaper,
  uniqueStrings,
  upsertCleanPaper,
};
