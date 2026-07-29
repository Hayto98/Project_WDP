const crypto = require('crypto');
const DataSource = require('../models/DataSource');
const { sources: sourceConfig, jwt } = require('../config/env');
const { logAction } = require('../utils/systemLogger');

const AUTH_MODES = {
  OpenAlex: 'mailto',
  'Semantic Scholar': 'api_key',
  Crossref: 'mailto',
  arXiv: 'none',
  'IEEE Xplore': 'api_key',
  'ACM Digital Library': 'none',
  Exa: 'api_key',
};

const SOURCE_ENDPOINTS = {
  OpenAlex: sourceConfig.openAlexApiUrl || 'https://api.openalex.org',
  'Semantic Scholar': 'https://api.semanticscholar.org',
  Crossref: sourceConfig.crossrefApiUrl || 'https://api.crossref.org',
  arXiv: 'https://export.arxiv.org/api',
  'IEEE Xplore': sourceConfig.ieeeApiUrl || 'https://ieeexploreapi.ieee.org',
  'ACM Digital Library': 'https://dl.acm.org',
  Exa: sourceConfig.exaApiUrl || 'https://api.exa.ai',
};

function getAuthMode(sourceName) {
  return AUTH_MODES[sourceName] || 'none';
}

function getEncryptionKey() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY || jwt.secret || 'dev_jwt_secret';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted credential payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function envFallback(sourceName) {
  switch (sourceName) {
    case 'OpenAlex':
      return { apiKey: null, mailto: sourceConfig.openAlexMailto || '', endpoint: SOURCE_ENDPOINTS.OpenAlex };
    case 'Semantic Scholar':
      return {
        apiKey: sourceConfig.semanticScholarApiKey || '',
        mailto: null,
        endpoint: SOURCE_ENDPOINTS['Semantic Scholar'],
      };
    case 'Crossref':
      return { apiKey: null, mailto: sourceConfig.crossrefMailto || '', endpoint: SOURCE_ENDPOINTS.Crossref };
    case 'IEEE Xplore':
      return {
        apiKey: sourceConfig.ieeeXploreApiKey || sourceConfig.ieeeApiKey || '',
        mailto: null,
        endpoint: SOURCE_ENDPOINTS['IEEE Xplore'],
      };
    case 'Exa':
      return { apiKey: sourceConfig.exaApiKey || '', mailto: null, endpoint: SOURCE_ENDPOINTS.Exa };
    case 'arXiv':
      return { apiKey: null, mailto: null, endpoint: SOURCE_ENDPOINTS.arXiv };
    case 'ACM Digital Library':
      return { apiKey: null, mailto: sourceConfig.crossrefMailto || '', endpoint: SOURCE_ENDPOINTS['ACM Digital Library'] };
    default:
      return { apiKey: null, mailto: null, endpoint: null };
  }
}

function maskKey(last4) {
  if (!last4) return null;
  return `••••${last4}`;
}

async function getEffectiveAuth(sourceName) {
  const doc = await DataSource.findOne({ name: sourceName }).lean();
  const env = envFallback(sourceName);
  const authMode = getAuthMode(sourceName);

  let apiKey = null;
  let hasDbKey = false;
  if (doc?.credentials?.api_key_encrypted) {
    try {
      apiKey = decrypt(doc.credentials.api_key_encrypted);
      hasDbKey = Boolean(apiKey);
    } catch (err) {
      console.warn(`Failed to decrypt API key for ${sourceName}:`, err.message);
    }
  }

  const hasEnvKey = Boolean(env.apiKey);
  if (!apiKey && hasEnvKey) apiKey = env.apiKey;

  const mailto = (doc?.credentials?.mailto || env.mailto || '').trim() || null;

  return {
    sourceName,
    authMode,
    apiKey: apiKey || null,
    mailto,
    endpoint: doc?.api_endpoint || env.endpoint || SOURCE_ENDPOINTS[sourceName] || null,
    hasDbKey,
    hasEnvKey,
    keySource: hasDbKey ? 'database' : hasEnvKey ? 'env' : 'none',
    last4: doc?.credentials?.api_key_last4 || (apiKey ? String(apiKey).slice(-4) : null),
  };
}

function toPublicCredentials(doc, effective = null) {
  const name = doc?.name;
  const authMode = getAuthMode(name);
  const creds = doc?.credentials || {};
  const hasDbKey = Boolean(creds.api_key_encrypted);
  const env = envFallback(name);
  const hasEnvKey = Boolean(effective?.hasEnvKey ?? env.apiKey);
  const mailto = (creds.mailto || effective?.mailto || env.mailto || '').trim() || null;
  const hasDbMailto = Boolean(creds.mailto);
  const hasEnvMailto = Boolean(env.mailto);

  let keySource = 'none';
  if (authMode === 'api_key') {
    keySource = hasDbKey ? 'database' : hasEnvKey ? 'env' : 'none';
  } else if (authMode === 'mailto') {
    keySource = hasDbMailto ? 'database' : hasEnvMailto ? 'env' : 'none';
  }

  return {
    authMode,
    hasApiKey: authMode === 'api_key' ? (hasDbKey || hasEnvKey) : false,
    apiKeyMasked: hasDbKey ? maskKey(creds.api_key_last4) : null,
    keySource,
    mailto,
    lastTestedAt: creds.last_tested_at || null,
    lastTestOk: creds.last_test_ok ?? null,
    lastTestMessage: creds.last_test_message || null,
  };
}

async function toPublicDataSource(doc) {
  const lean = doc?.toObject ? doc.toObject() : { ...doc };
  const effective = await getEffectiveAuth(lean.name);
  const { credentials: _hidden, ...rest } = lean;
  return {
    ...rest,
    credentials: toPublicCredentials(lean, effective),
  };
}

async function setApiKey(sourceId, apiKey, userId = null) {
  const source = await DataSource.findById(sourceId);
  if (!source) {
    throw Object.assign(new Error('Data source not found'), { statusCode: 404 });
  }
  const mode = getAuthMode(source.name);
  if (mode !== 'api_key') {
    throw Object.assign(new Error(`${source.name} does not use an API key`), { statusCode: 400 });
  }
  const trimmed = String(apiKey || '').trim();
  if (!trimmed) {
    throw Object.assign(new Error('apiKey is required'), { statusCode: 400 });
  }

  source.credentials = source.credentials || {};
  source.credentials.api_key_encrypted = encrypt(trimmed);
  source.credentials.api_key_last4 = trimmed.slice(-4);
  source.credentials.updated_at = new Date();
  source.credentials.updated_by = userId || null;
  await source.save();

  await logAction('SourceCredential', userId, source.name, {
    action: 'Set API key',
    target: source.name,
    key_last4: source.credentials.api_key_last4,
    severity: 'info',
  });

  return toPublicDataSource(source);
}

async function setMailto(sourceId, mailto, userId = null) {
  const source = await DataSource.findById(sourceId);
  if (!source) {
    throw Object.assign(new Error('Data source not found'), { statusCode: 404 });
  }
  const mode = getAuthMode(source.name);
  if (mode !== 'mailto') {
    throw Object.assign(new Error(`${source.name} does not use a mailto contact`), { statusCode: 400 });
  }
  const trimmed = String(mailto || '').trim();
  if (!trimmed) {
    throw Object.assign(new Error('mailto is required'), { statusCode: 400 });
  }

  source.credentials = source.credentials || {};
  source.credentials.mailto = trimmed;
  source.credentials.updated_at = new Date();
  source.credentials.updated_by = userId || null;
  await source.save();

  await logAction('SourceCredential', userId, source.name, {
    action: 'Set mailto',
    target: source.name,
    mailto: trimmed,
    severity: 'info',
  });

  return toPublicDataSource(source);
}

async function clearCredentials(sourceId, userId = null) {
  const source = await DataSource.findById(sourceId);
  if (!source) {
    throw Object.assign(new Error('Data source not found'), { statusCode: 404 });
  }

  const mode = getAuthMode(source.name);
  source.credentials = source.credentials || {};
  if (mode === 'api_key') {
    source.credentials.api_key_encrypted = null;
    source.credentials.api_key_last4 = null;
  } else if (mode === 'mailto') {
    source.credentials.mailto = null;
  } else {
    throw Object.assign(new Error(`${source.name} has no stored credentials to clear`), { statusCode: 400 });
  }
  source.credentials.updated_at = new Date();
  source.credentials.updated_by = userId || null;
  await source.save();

  await logAction('SourceCredential', userId, source.name, {
    action: mode === 'api_key' ? 'Clear API key' : 'Clear mailto',
    target: source.name,
    severity: 'warning',
  });

  return toPublicDataSource(source);
}

async function probeSource(sourceName, overrides = {}) {
  const effective = await getEffectiveAuth(sourceName);
  const apiKey = overrides.apiKey !== undefined ? String(overrides.apiKey || '').trim() : effective.apiKey;
  const mailto = overrides.mailto !== undefined ? String(overrides.mailto || '').trim() : effective.mailto;

  switch (sourceName) {
    case 'OpenAlex': {
      const url = new URL('/works', effective.endpoint || SOURCE_ENDPOINTS.OpenAlex);
      url.searchParams.set('search', 'large language models');
      url.searchParams.set('per-page', '1');
      if (mailto) url.searchParams.set('mailto', mailto);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
      const body = await res.json();
      return `${body.meta?.count ?? 0} records available`;
    }
    case 'Crossref': {
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('query', 'large language models');
      url.searchParams.set('rows', '1');
      if (mailto) url.searchParams.set('mailto', mailto);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
      const body = await res.json();
      return `${body.message?.['total-results'] ?? 0} records available`;
    }
    case 'arXiv': {
      const url = 'https://export.arxiv.org/api/query?search_query=all:large%20language%20models&start=0&max_results=1';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes('<feed')) throw new Error('arXiv returned unexpected response');
      return 'Feed reachable';
    }
    case 'Semantic Scholar': {
      const headers = {};
      if (apiKey) headers['x-api-key'] = apiKey;
      const url = 'https://api.semanticscholar.org/graph/v1/paper/search?query=large%20language%20models&limit=1&fields=title,year';
      const res = await fetch(url, { headers });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Semantic Scholar HTTP ${res.status}`);
      const body = JSON.parse(text);
      return `${body.data?.length ?? 0} sample records`;
    }
    case 'IEEE Xplore': {
      if (!apiKey) throw new Error('IEEE API key is not configured');
      const url = new URL('https://ieeexploreapi.ieee.org/api/v1/search/articles');
      url.searchParams.set('apikey', apiKey);
      url.searchParams.set('format', 'json');
      url.searchParams.set('querytext', 'large language models');
      url.searchParams.set('max_records', '1');
      const res = await fetch(url);
      const text = await res.text();
      if (/developer\s+inactive/i.test(text) || res.status === 403) {
        throw new Error('IEEE API key awaiting activation (Developer Inactive)');
      }
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
    case 'ACM Digital Library': {
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('query.publisher-name', 'Association for Computing Machinery');
      url.searchParams.set('query.title', 'large language models');
      url.searchParams.set('rows', '1');
      if (mailto) url.searchParams.set('mailto', mailto);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ACM/Crossref HTTP ${res.status}`);
      const body = await res.json();
      return `${body.message?.['total-results'] ?? 0} ACM-indexed records available`;
    }
    case 'Exa': {
      if (!apiKey) throw new Error('EXA API key is not configured');
      const res = await fetch(new URL('/search', effective.endpoint || SOURCE_ENDPOINTS.Exa), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
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
    default:
      throw new Error(`Unsupported source: ${sourceName}`);
  }
}

async function testSourceById(sourceId, overrides = {}, userId = null) {
  const source = await DataSource.findById(sourceId);
  if (!source) {
    throw Object.assign(new Error('Data source not found'), { statusCode: 404 });
  }

  const started = Date.now();
  let ok = false;
  let message = 'OK';
  try {
    message = await probeSource(source.name, overrides);
    ok = true;
  } catch (err) {
    ok = false;
    message = err.message || 'API check failed';
  }
  const latencyMs = Date.now() - started;

  const usedEphemeralKey = overrides.apiKey !== undefined || overrides.mailto !== undefined;
  if (!usedEphemeralKey) {
    source.credentials = source.credentials || {};
    source.credentials.last_tested_at = new Date();
    source.credentials.last_test_ok = ok;
    source.credentials.last_test_message = message;
    await source.save();
  }

  await logAction('SourceCredential', userId, source.name, {
    action: 'Test API',
    target: source.name,
    ok,
    message,
    latencyMs,
    ephemeral: usedEphemeralKey,
    severity: ok ? 'info' : 'warning',
  });

  return {
    ok,
    message,
    latencyMs,
    source: await toPublicDataSource(source),
  };
}

module.exports = {
  AUTH_MODES,
  SOURCE_ENDPOINTS,
  getAuthMode,
  getEffectiveAuth,
  toPublicCredentials,
  toPublicDataSource,
  setApiKey,
  setMailto,
  clearCredentials,
  probeSource,
  testSourceById,
  encrypt,
  decrypt,
};
