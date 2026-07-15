const test = require('node:test');
const assert = require('node:assert/strict');
const liveTrendService = require('../src/services/liveTrend.service');
const liveFetchService = require('../src/services/liveFetch.service');
const AnalysisReport = require('../src/models/AnalysisReport');

test.describe('liveTrend.service', () => {
  let originalFetchLivePapers;
  let originalAnalysisReportCreate;

  test.beforeEach(() => {
    originalFetchLivePapers = liveFetchService.fetchLivePapers;
    originalAnalysisReportCreate = AnalysisReport.create;
  });

  test.afterEach(() => {
    liveFetchService.fetchLivePapers = originalFetchLivePapers;
    AnalysisReport.create = originalAnalysisReportCreate;
  });

  test.it('throws if topic is empty', async () => {
    await assert.rejects(
      () => liveTrendService.getLiveTrends({ topic: '' }),
      (err) => err.message === 'Topic is required' && err.statusCode === 400
    );
  });

  test.it('fetches papers and extracts top terms for trend data', async () => {
    liveFetchService.fetchLivePapers = async () => ({
      sources: ['OpenAlex'],
      papers: [
        { id: '1', title: 'Federated learning in medical imaging', abstract: '', year: 2023, source: 'OpenAlex', keywords: [], fields: [] },
        { id: '2', title: 'Another federated learning paper', abstract: '', year: 2023, source: 'OpenAlex', keywords: [], fields: [] },
        { id: '3', title: 'Medical imaging survey', abstract: '', year: 2024, source: 'OpenAlex', keywords: [], fields: [] },
      ],
      sourceErrors: [],
      sourceCount: 1,
    });

    const result = await liveTrendService.getLiveTrends({
      topic: 'federated learning medical imaging',
      sources: ['OpenAlex'],
      yearFrom: 2023,
      yearTo: 2024,
      maxRecordsPerSource: 50,
    });

    assert.equal(result.topic, 'federated learning medical imaging');
    assert.equal(result.totalFetched, 3);
    assert.equal(result.cached, false);
    
    // Check trendPoints generated for 2023 and 2024
    assert.equal(result.trendPoints.length, 2);
    const y2023 = result.trendPoints.find(p => p.period === '2023');
    const y2024 = result.trendPoints.find(p => p.period === '2024');
    
    assert.ok(y2023);
    assert.ok(y2024);
    assert.equal(y2023['Federated Learning'], 2); // 2 papers in 2023 have FL
    assert.equal(y2024['Medical Imaging'], 1); // 1 paper in 2024 has MI
  });

  test.it('uses cache for identical payloads', async () => {
    let callCount = 0;
    liveFetchService.fetchLivePapers = async () => {
      callCount++;
      return { sources: ['arXiv'], papers: [], sourceErrors: [], sourceCount: 1 };
    };

    // Need a unique cache key so it doesn't conflict with other tests
    const payload = { topic: 'test cache cache', sources: ['arXiv'], yearFrom: 2020, yearTo: 2021 };
    const res1 = await liveTrendService.getLiveTrends(payload);
    assert.equal(res1.cached, false);
    assert.equal(callCount, 1);

    const res2 = await liveTrendService.getLiveTrends(payload);
    assert.equal(res2.cached, true);
    assert.equal(callCount, 1); // should not fetch again
  });

  test.it('saves live trend report to db', async () => {
    let createdDoc = null;
    AnalysisReport.create = async (doc) => {
      createdDoc = doc;
      return { _id: 'mock-id-123', report_type: doc.report_type, generated_at: doc.generated_at };
    };

    const result = {
      topic: 'test',
      sources: ['OpenAlex'],
      yearFrom: 2023,
      yearTo: 2024,
    };

    const saved = await liveTrendService.saveLiveTrendReport(result, 'user-123');
    assert.equal(saved.id, 'mock-id-123');
    assert.equal(saved.reportType, 'CustomSearch');
    assert.equal(createdDoc.criteria.mode, 'live_trend');
    assert.equal(createdDoc.criteria.requested_by, 'user-123');
  });
});
