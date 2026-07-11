const DataSource = require('../models/DataSource');
const { sources: sourceConfig } = require('../config/env');
const { normalizeTitle, upsertCleanPaper } = require('./paperCleaning.service');

const IEEE_API_URL = 'https://ieeexploreapi.ieee.org/api/v1/search/articles';

function clampMaxRecords(value) {
  const n = parseInt(value, 10) || 25;
  return Math.max(1, Math.min(n, 50));
}

function mapType(contentType = '') {
  const value = contentType.toLowerCase();
  if (value.includes('journal') || value.includes('magazine')) return 'Journal';
  if (value.includes('conference') || value.includes('proceeding')) return 'Conference';
  return 'Preprint';
}

function mapAuthors(article) {
  const authors = article.authors?.authors || article.authors || [];
  if (!Array.isArray(authors)) return [];
  return authors
    .map((author, index) => ({
      name: author.full_name || author.name || author.preferred_name || '',
      is_primary: index === 0,
    }))
    .filter((author) => author.name);
}

function mapKeywords(article) {
  const terms = [
    ...(article.index_terms?.ieee_terms?.terms || []),
    ...(article.index_terms?.author_terms?.terms || []),
    ...(article.controlledterms || []),
  ];
  return [...new Set(terms.map((term) => String(term).trim()).filter(Boolean))].slice(0, 12);
}

function inferResearchFields(query, article) {
  const haystack = [
    query,
    article.title,
    article.abstract,
    mapKeywords(article).join(' '),
  ].join(' ').toLowerCase();

  if (haystack.includes('federated')) return ['Federated Learning'];
  if (haystack.includes('large language') || haystack.includes('llm')) return ['Large Language Models'];
  if (haystack.includes('graph neural') || haystack.includes('gnn')) return ['Graph Neural Networks'];
  if (haystack.includes('quantum')) return ['Quantum Machine Learning'];
  if (haystack.includes('edge') || haystack.includes('tinyml')) return ['Edge & TinyML'];
  if (haystack.includes('vision') || haystack.includes('image')) return ['Computer Vision'];
  return ['Computer Science'];
}

function mapArticleToPaper(article, query) {
  const title = article.title || article.article_title || 'Untitled IEEE article';
  const year = Number(article.publication_year || article.publicationYear || new Date().getFullYear());
  const doi = article.doi || undefined;
  const externalId = String(article.article_number || article.articleNumber || article.arnumber || doi || title);

  return {
    doi,
    title,
    title_normalized: normalizeTitle(title),
    abstract: article.abstract || '',
    publication_year: year,
    publication_month: Number(article.publication_month) || undefined,
    source_name: 'IEEE Xplore',
    original_url: article.html_url || article.pdf_url || article.abstract_url || 'https://ieeexplore.ieee.org/',
    citation_count: Number(article.citing_paper_count || article.citation_count || 0),
    type: mapType(article.content_type || article.publication_title || ''),
    status: 'Cleaned',
    authors: mapAuthors(article),
    keywords: mapKeywords(article),
    research_fields: inferResearchFields(query, article),
    sources: [{
      source_name: 'IEEE Xplore',
      external_id: externalId,
      fetched_at: new Date(),
    }],
  };
}

async function fetchIEEEArticles(query, maxRecords = 25) {
  const apiKey = sourceConfig.ieeeXploreApiKey;
  if (!apiKey) {
    throw Object.assign(new Error('IEEE_XPLORE_API_KEY is not configured'), { statusCode: 500 });
  }

  const url = new URL(IEEE_API_URL);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('querytext', query);
  url.searchParams.set('max_records', String(clampMaxRecords(maxRecords)));
  url.searchParams.set('start_record', '1');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('sort_field', 'publication_year');

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.message || `IEEE API error: ${res.status}`), { statusCode: res.status });
  }
  if (body.error) {
    throw Object.assign(new Error(Array.isArray(body.error) ? body.error.join('; ') : body.error), { statusCode: 502 });
  }

  return {
    articles: body.articles || [],
    total: Number(body.total_records || body.totalRecords || body.articles?.length || 0),
  };
}

async function importIEEEByQuery(query, maxRecords = 25) {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    throw Object.assign(new Error('Query is required for IEEE sync'), { statusCode: 400 });
  }

  const { articles, total } = await fetchIEEEArticles(trimmed, maxRecords);
  let imported = 0;
  let skipped = 0;

  for (const article of articles) {
    const paper = mapArticleToPaper(article, trimmed);
    const outcome = await upsertCleanPaper(paper);
    if (outcome.imported) imported += 1;
    if (outcome.skipped) skipped += 1;
  }

  await DataSource.updateOne(
    { name: 'IEEE Xplore' },
    {
      $set: {
        enabled: true,
        last_sync_at: new Date(),
        last_sync_status: 'Success',
        last_error: null,
      },
      $inc: { papers_synced_count: imported },
    },
  );

  return { imported, skipped, sourceTotal: total };
}

module.exports = {
  importIEEEByQuery,
  mapArticleToPaper,
};
