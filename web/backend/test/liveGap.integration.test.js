/**
 * Integration tests for Live Research Gap API:
 * POST /api/v1/analytics/gaps/live
 * POST /api/v1/analytics/gaps/live/save
 *
 * External API calls are stubbed at the service level so tests run fast
 * and deterministically without network or rate-limit flakiness.
 */
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Start server fresh for these tests
let server;
let baseUrl;

async function startServer() {
  const { app } = require('../src/app');
  const { mongodbUri } = require('../src/config/env');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongodbUri);
  }
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
      resolve();
    });
  });
}

async function stopServer() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Mock helpers — stub external source services so tests are deterministic
// ---------------------------------------------------------------------------

const MOCK_PAPERS_OPENALEX = [
  {
    id: 'https://openalex.org/W3123456789',
    title: 'Federated Learning for Privacy-Preserving Medical Image Analysis',
    abstract_inverted_index: null,
    publication_year: 2024,
    type_crossref: 'journal-article',
   doi: '10.1000/journal.2024.fl-mia',
    original_url: 'https://doi.org/10.1000/journal.2024.fl-mia',
    authorships: [{ author: { display_name: 'Alice Tran' } }],
    concepts: [{ display_name: 'Federated Learning', level: 0 }, { display_name: 'Medical Imaging', level: 0 }],
    cited_by_count: 45,
  },
  {
    id: 'https://openalex.org/W3123456790',
    title: 'Federated Learning with Differential Privacy in Healthcare',
    abstract_inverted_index: null,
    publication_year: 2023,
    type_crossref: 'conference',
    doi: '10.1000/conf.2023.fl-dp',
    original_url: 'https://doi.org/10.1000/conf.2023.fl-dp',
    authorships: [{ author: { display_name: 'Bob Nguyen' } }],
    concepts: [{ display_name: 'Federated Learning', level: 0 }, { display_name: 'Healthcare', level: 0 }],
    cited_by_count: 32,
  },
  {
    id: 'https://openalex.org/W3123456791',
    title: 'Graph Neural Networks for Medical Image Segmentation',
    abstract_inverted_index: null,
    publication_year: 2024,
    type_crossref: 'journal-article',
    doi: '10.1000/journal.2024.gnn-mis',
    original_url: 'https://doi.org/10.1000/journal.2024.gnn-mis',
    authorships: [{ author: { display_name: 'Carol Le' } }],
    concepts: [{ display_name: 'Graph Neural Networks', level: 0 }, { display_name: 'Medical Imaging', level: 0 }],
    cited_by_count: 28,
  },
  {
    id: 'https://openalex.org/W3123456792',
    title: 'Survey on Federated Learning Applications',
    abstract_inverted_index: null,
    publication_year: 2022,
    type_crossref: 'journal-article',
    doi: '10.1000/journal.2022.fl-survey',
    original_url: 'https://doi.org/10.1000/journal.2022.fl-survey',
    authorships: [{ author: { display_name: 'David Pham' } }],
    concepts: [{ display_name: 'Federated Learning', level: 0 }, { display_name: 'Applications', level: 0 }],
    cited_by_count: 120,
  },
  {
    id: 'https://openalex.org/W3123456793',
    title: 'Medical Image Segmentation Using Deep Learning',
    abstract_inverted_index: null,
    publication_year: 2023,
    type_crossref: 'journal-article',
    doi: '10.1000/journal.2023.mi-dl',
    original_url: 'https://doi.org/10.1000/journal.2023.mi-dl',
    authorships: [{ author: { display_name: 'Eve Hoang' } }],
    concepts: [{ display_name: 'Deep Learning', level: 0 }, { display_name: 'Medical Imaging', level: 0 }],
    cited_by_count: 88,
  },
];

function stubExternalAPIs() {
  // Override require cache so external HTTP calls never fire
  const openalex = require('../src/services/openalex.service');
  const crossref = require('../src/services/crossref.service');
  const arxiv = require('../src/services/arxiv.service');

  openalex.fetchOpenAlexWorks = async () => ({ works: MOCK_PAPERS_OPENALEX });
  crossref.fetchCrossrefWorks = async () => ({ items: [] });
  arxiv.fetchArxivPapers = async () => ({ entries: [] });
}

function restoreExternalAPIs() {
  // No-op; test isolation comes from separate process / module cache per run
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const User = require('../src/models/User');
const AnalysisReport = require('../src/models/AnalysisReport');

async function makeUser(email) {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  await User.deleteMany({ email });
  const user = await User.create({
    email,
    password_hash: passwordHash,
    full_name: 'Live Gap Test User',
    roles: ['Student'],
    status: 'Active',
  });
  const { res, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'TestPass123!' }),
  });
  assert.equal(res.status, 200);
  return { user, token: body.data.accessToken };
}

async function login(email) {
  const { res, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'TestPass123!' }),
  });
  return body.data.accessToken;
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

let testUserEmail;
let testUserToken;

describe('Live Research Gap API', () => {
  before(async () => {
    await startServer();
    stubExternalAPIs();
  });

  after(async () => {
    restoreExternalAPIs();
    await User.deleteMany({ email: testUserEmail });
    await AnalysisReport.deleteMany({ 'criteria.mode': 'live' });
    await stopServer();
  });

  beforeEach(async () => {
    testUserEmail = `livegap-${Date.now()}-${Math.random().toString(36).slice(2)}@wdp-test.example.com`;
    const { token } = await makeUser(testUserEmail);
    testUserToken = token;
  });

  afterEach(async () => {
    await User.deleteMany({ email: testUserEmail });
    await AnalysisReport.deleteMany({ 'criteria.mode': 'live' });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/analytics/gaps/live
  // -------------------------------------------------------------------------

  it('returns 401 without a token', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      body: JSON.stringify({ topic: 'federated learning medical imaging' }),
    });
    assert.equal(res.status, 401);
  });

  it('returns 400 when topic is missing', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('returns 400 when topic is too short', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'a' }),
    });
    assert.equal(res.status, 400);
  });

  it('returns 400 when yearFrom > yearTo', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', yearFrom: 2025, yearTo: 2020 }),
    });
    assert.equal(res.status, 400);
  });

  it('returns 400 when maxRecordsPerSource exceeds 100', async () => {
    const { res } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning', maxRecordsPerSource: 200 }),
    });
    assert.equal(res.status, 400);
  });

  it('returns 400 when sources array is empty', async () => {
    const { res } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning', sources: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('returns 400 when sources contains invalid source name', async () => {
    const { res } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning', sources: ['InvalidSource'] }),
    });
    assert.equal(res.status, 400);
  });

  it('returns 200 with valid payload and correct response shape', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({
        topic: 'federated learning medical imaging',
        sources: ['OpenAlex'],
        yearFrom: 2021,
        yearTo: 2025,
        maxRecordsPerSource: 30,
        topK: 12,
      }),
    });

    assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.mode, 'live');
    assert.equal(body.data.topic, 'federated learning medical imaging');
    assert.ok(Array.isArray(body.data.sources));
    assert.ok(Array.isArray(body.data.gaps));
    assert.ok(typeof body.data.totalFetched === 'number');
    assert.ok(typeof body.data.generatedAt === 'string');
    assert.ok(body.data.summary);
    assert.ok(typeof body.data.summary.strongGaps === 'number');
    assert.ok(typeof body.data.summary.potentialGaps === 'number');
    assert.ok(typeof body.data.summary.lowConfidence === 'number');
  });

  it('applies defaults when optional fields are omitted', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'large language models education' }),
    });

    assert.equal(res.status, 200);
    assert.deepEqual(body.data.sources, ['OpenAlex', 'Crossref', 'arXiv']);
    assert.equal(body.data.yearFrom, 2021);
    assert.equal(body.data.yearTo, new Date().getFullYear());
    assert.equal(body.data.totalFetched, 5); // 5 mock papers from OpenAlex
  });

  it('returns gaps with all required fields per gap object', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', topK: 5 }),
    });

    assert.equal(res.status, 200);
    const gap = body.data.gaps[0];
    if (gap) {
      assert.ok(typeof gap.id === 'string');
      assert.ok(typeof gap.field === 'string');
      assert.ok(typeof gap.aspect === 'string');
      assert.ok(typeof gap.gapScore === 'number');
      assert.ok(gap.gapScore >= 0 && gap.gapScore <= 100);
      assert.ok(['strong', 'potential', 'needs_data', 'unclear'].includes(gap.level));
      assert.ok(['low', 'medium', 'high'].includes(gap.confidence));
      assert.ok(gap.metrics);
      assert.ok(typeof gap.metrics.directCount === 'number');
      assert.ok(typeof gap.metrics.expectedCount === 'number');
      assert.ok(typeof gap.metrics.scarcityScore === 'number');
      assert.ok(typeof gap.metrics.growthScore === 'number');
      assert.ok(typeof gap.metrics.adjacencyScore === 'number');
      assert.ok(typeof gap.metrics.noveltyScore === 'number');
      assert.ok(typeof gap.metrics.evidenceScore === 'number');
      assert.ok(Array.isArray(gap.reasons));
      assert.ok(Array.isArray(gap.evidence));
    }
  });

  it('filters out gaps with gapScore below 40', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'quantum computing cooking recipes', sources: ['OpenAlex'], maxRecordsPerSource: 10 }),
    });

    assert.equal(res.status, 200);
    for (const gap of body.data.gaps) {
      assert.ok(gap.gapScore >= 40, `Expected gapScore >= 40, got ${gap.gapScore}`);
    }
  });

  it('sorts gaps by gapScore descending', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', topK: 20 }),
    });

    assert.equal(res.status, 200);
    const scores = body.data.gaps.map((g) => g.gapScore);
    for (let i = 1; i < scores.length; i += 1) {
      assert.ok(
        scores[i - 1] >= scores[i],
        `Gaps not sorted descending: ${scores[i - 1]} < ${scores[i]}`,
      );
    }
  });

  it('respects topK limit on number of returned gaps', async () => {
    for (const topK of [3, 5, 10]) {
      const { res, body } = await request('/analytics/gaps/live', {
        method: 'POST',
        headers: auth(testUserToken),
        body: JSON.stringify({ topic: 'federated learning medical imaging', topK }),
      });
      assert.equal(res.status, 200);
      assert.ok(body.data.gaps.length <= topK, `Expected <= ${topK} gaps, got ${body.data.gaps.length}`);
    }
  });

  it('sets warning for overly broad topic', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'AI', sources: ['OpenAlex'] }),
    });

    assert.equal(res.status, 200);
    const hasBroadTopicWarning = body.data.warnings?.some((w) =>
      w.toLowerCase().includes('topic') && w.toLowerCase().includes('rộng'),
    );
    assert.ok(hasBroadTopicWarning, `Expected broad topic warning, got: ${JSON.stringify(body.data.warnings)}`);
  });

  it('sets warning when fetched paper count is low', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', maxRecordsPerSource: 10 }),
    });

    assert.equal(res.status, 200);
    const hasLowDataWarning = body.data.warnings?.some((w) =>
      w.toLowerCase().includes('ít') || w.toLowerCase().includes('tham khảo'),
    );
    assert.ok(hasLowDataWarning, `Expected low-data warning, got: ${JSON.stringify(body.data.warnings)}`);
  });

  it('sets cached:false on first call, cached:true on second identical call', async () => {
    const payload = { topic: 'federated learning medical imaging', sources: ['OpenAlex'], maxRecordsPerSource: 30 };

    const first = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify(payload),
    });
    assert.equal(first.res.status, 200);
    assert.equal(first.body.data.cached, false, 'First call should not be cached');

    const second = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify(payload),
    });
    assert.equal(second.res.status, 200);
    assert.equal(second.body.data.cached, true, 'Second call should be cached');
  });

  it('returns evidence papers with title, year, source, and url', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', sources: ['OpenAlex'] }),
    });

    assert.equal(res.status, 200);
    const topGap = body.data.gaps[0];
    if (topGap && topGap.evidence.length > 0) {
      const evidence = topGap.evidence[0];
      assert.ok(typeof evidence.title === 'string');
      assert.ok(evidence.year !== undefined);
      assert.ok(typeof evidence.source === 'string');
      assert.ok(evidence.source === 'OpenAlex');
      assert.ok(typeof evidence.url === 'string' && evidence.url.startsWith('http'), `Expected evidence url, got: ${JSON.stringify(evidence)}`);
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/analytics/gaps/live/save
  // -------------------------------------------------------------------------

  it('returns 401 on save without token', async () => {
    const { res } = await request('/analytics/gaps/live/save', {
      method: 'POST',
      body: JSON.stringify({ result: { topic: 'test', gaps: [], sources: [], summary: {} } }),
    });
    assert.equal(res.status, 401);
  });

  it('returns 400 when result is missing from save body', async () => {
    const { res, body } = await request('/analytics/gaps/live/save', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('saves a live gap report and returns report id', async () => {
    const { res: gapRes, body: gapBody } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', sources: ['OpenAlex'] }),
    });
    assert.equal(gapRes.status, 200);

    const { res: saveRes, body: saveBody } = await request('/analytics/gaps/live/save', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ result: gapBody.data }),
    });

    assert.equal(saveRes.status, 201, `Save failed: ${JSON.stringify(saveBody)}`);
    assert.equal(saveBody.success, true);
    assert.ok(saveBody.data.id, 'Expected report id in response');
    assert.equal(saveBody.data.reportType, 'CustomSearch');

    // Verify it landed in MongoDB
    const saved = await AnalysisReport.findById(saveBody.data.id).lean();
    assert.ok(saved, 'Report not found in MongoDB');
    assert.equal(saved.report_type, 'CustomSearch');
    assert.equal(saved.criteria.mode, 'live');
    assert.equal(saved.criteria.topic, 'federated learning medical imaging');
    assert.ok(Array.isArray(saved.criteria.sources));
    assert.ok(saved.result_snapshot);
    assert.ok(Array.isArray(saved.result_snapshot.gaps));
  });

  it('saved report has correct expires_at (7 days from now)', async () => {
    const { res: gapRes, body: gapBody } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'graph neural networks cybersecurity', sources: ['OpenAlex'] }),
    });
    assert.equal(gapRes.status, 200);

    const { res: saveRes, body: saveBody } = await request('/analytics/gaps/live/save', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ result: gapBody.data }),
    });
    assert.equal(saveRes.status, 201);

    const saved = await AnalysisReport.findById(saveBody.data.id).lean();
    const diffMs = saved.expires_at.getTime() - saved.generated_at.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    assert.ok(diffDays >= 6.9 && diffDays <= 7.1, `Expected ~7 days TTL, got ${diffDays} days`);
  });

  it('gapScore computed correctly for known strong-weak pair', async () => {
    // "Federated Learning" is strong in mock data, "Medical Imaging" is medium.
    // The pair "Federated Learning + Medical Imaging" has only 1 direct paper in mock.
    // Expected: scarcityScore high, gapScore >= 60
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', sources: ['OpenAlex'] }),
    });

    assert.equal(res.status, 200);
    const flMiGap = body.data.gaps.find(
      (g) =>
        g.field.toLowerCase().includes('federated') &&
        g.aspect.toLowerCase().includes('medical'),
    );
    if (flMiGap) {
      assert.ok(
        flMiGap.gapScore >= 60,
        `FL+MI gapScore should be >= 60, got ${flMiGap.gapScore}`,
      );
      assert.ok(flMiGap.confidence !== 'low' || body.data.totalFetched < 20,
        'Confidence should match data volume');
    }
  });

  it('summary counts match actual gap levels', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', sources: ['OpenAlex'] }),
    });

    assert.equal(res.status, 200);
    const { summary, gaps } = body.data;
    const actualStrong = gaps.filter((g) => g.level === 'strong').length;
    const actualPotential = gaps.filter((g) => g.level === 'potential').length;
    const actualLow = gaps.filter((g) => g.confidence === 'low' || g.level === 'needs_data').length;

    assert.equal(summary.strongGaps, actualStrong, 'strongGaps count mismatch');
    assert.equal(summary.potentialGaps, actualPotential, 'potentialGaps count mismatch');
    assert.equal(summary.lowConfidence, actualLow, 'lowConfidence count mismatch');
  });

  it('evidence papers are sorted by citationCount descending', async () => {
    const { res, body } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning medical imaging', sources: ['OpenAlex'] }),
    });

    assert.equal(res.status, 200);
    for (const gap of body.data.gaps) {
      const citations = gap.evidence.map((e) => e.citationCount ?? 0);
      for (let i = 1; i < citations.length; i += 1) {
        assert.ok(
          citations[i - 1] >= citations[i],
          `Evidence not sorted by citations for gap ${gap.id}`,
        );
      }
    }
  });

  it('unknown source in request body is rejected', async () => {
    const { res } = await request('/analytics/gaps/live', {
      method: 'POST',
      headers: auth(testUserToken),
      body: JSON.stringify({ topic: 'federated learning', sources: ['OpenAlex', 'FakeSource'] }),
    });
    assert.equal(res.status, 400);
  });
});
