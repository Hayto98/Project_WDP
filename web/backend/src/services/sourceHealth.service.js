const DataSource = require('../models/DataSource');
const { sources: sourceConfig } = require('../config/env');

const SUPPORTED_SOURCES = ['OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'ACM Digital Library', 'Exa'];

const SOURCE_ENDPOINTS = {
  OpenAlex: 'https://api.openalex.org',
  'Semantic Scholar': 'https://api.semanticscholar.org',
  Crossref: 'https://api.crossref.org',
  arXiv: 'https://export.arxiv.org/api',
  'IEEE Xplore': 'https://ieeexploreapi.ieee.org',
  'ACM Digital Library': 'https://dl.acm.org',
  Exa: 'https://api.exa.ai',
};

async function timedCheck(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return {
      name,
      ok: true,
      latencyMs: Date.now() - started,
      message: detail || 'OK',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - started,
      message: err.message || 'API check failed',
    };
  }
}

async function checkOpenAlex() {
  const url = new URL('/works', sourceConfig.openAlexApiUrl);
  url.searchParams.set('search', 'large language models');
  url.searchParams.set('per-page', '1');
  if (sourceConfig.openAlexMailto) url.searchParams.set('mailto', sourceConfig.openAlexMailto);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const body = await res.json();
  return `${body.meta?.count ?? 0} records available`;
}

async function checkCrossref() {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query', 'large language models');
  url.searchParams.set('rows', '1');
  if (sourceConfig.crossrefMailto) url.searchParams.set('mailto', sourceConfig.crossrefMailto);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const body = await res.json();
  return `${body.message?.['total-results'] ?? 0} records available`;
}

async function checkArxiv() {
  const url = 'https://export.arxiv.org/api/query?search_query=all:large%20language%20models&start=0&max_results=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('<feed')) throw new Error('arXiv returned unexpected response');
  return 'Feed reachable';
}

async function checkSemanticScholar() {
  const headers = {};
  if (sourceConfig.semanticScholarApiKey) headers['x-api-key'] = sourceConfig.semanticScholarApiKey;
  const url = 'https://api.semanticscholar.org/graph/v1/paper/search?query=large%20language%20models&limit=1&fields=title,year';
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Semantic Scholar HTTP ${res.status}`);
  const body = JSON.parse(text);
  return `${body.data?.length ?? 0} sample records`;
}

async function checkIEEE() {
  if (!sourceConfig.ieeeXploreApiKey) throw new Error('IEEE_XPLORE_API_KEY is not configured');
  const url = new URL('https://ieeexploreapi.ieee.org/api/v1/search/articles');
  url.searchParams.set('apikey', sourceConfig.ieeeXploreApiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('querytext', 'large language models');
  url.searchParams.set('max_records', '1');
  const res = await fetch(url);
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok || body.error) {
    throw new Error(body.error || body.message || body.raw || `IEEE HTTP ${res.status}`);
  }
  return `${body.total_records ?? 0} records available`;
}

async function checkExa() {
  if (!sourceConfig.exaApiKey) throw new Error('EXA_API_KEY is not configured');
  const res = await fetch(new URL('/search', sourceConfig.exaApiUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': sourceConfig.exaApiKey,
    },
    body: JSON.stringify({
      query: 'large language models academic paper',
      numResults: 1,
      type: 'auto',
      contents: { highlights: { numSentences: 1 } },
    }),
  });
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(body.error || body.message || body.raw || `Exa HTTP ${res.status}`);
  return `${body.results?.length ?? 0} sample records`;
}

async function checkACM() {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.publisher-name', 'Association for Computing Machinery');
  url.searchParams.set('query.title', 'large language models');
  url.searchParams.set('rows', '1');
  if (sourceConfig.crossrefMailto) url.searchParams.set('mailto', sourceConfig.crossrefMailto);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ACM/Crossref HTTP ${res.status}`);
  const body = await res.json();
  return `${body.message?.['total-results'] ?? 0} ACM-indexed records available`;
}

async function checkSourceApis() {
  const checks = await Promise.all([
    timedCheck('OpenAlex', checkOpenAlex),
    timedCheck('Semantic Scholar', checkSemanticScholar),
    timedCheck('Crossref', checkCrossref),
    timedCheck('arXiv', checkArxiv),
    timedCheck('IEEE Xplore', checkIEEE),
    timedCheck('ACM Digital Library', checkACM),
    timedCheck('Exa', checkExa),
  ]);

  await Promise.all(checks.map((check) => DataSource.updateOne(
    { name: check.name },
    {
      $setOnInsert: {
        name: check.name,
        api_endpoint: SOURCE_ENDPOINTS[check.name],
      },
      $set: {
        enabled: SUPPORTED_SOURCES.includes(check.name),
        last_sync_status: check.ok ? 'Success' : 'Failed',
        last_error: check.ok ? null : check.message,
        latency: `${(check.latencyMs / 1000).toFixed(1)}s`,
        error_rate: check.ok ? '0%' : '100%',
        last_sync_at: new Date(),
      },
    },
    { upsert: true },
  )));

  return checks;
}

module.exports = {
  checkSourceApis,
  SUPPORTED_SOURCES,
};
