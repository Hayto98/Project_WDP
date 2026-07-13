const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  clamp01,
  scoreCandidate,
  parseTopicTerms,
  dedupeLivePapers,
} = require('../src/services/liveGap.service');

describe('liveGap.service scoring', () => {
  it('clamps values into 0..1', () => {
    assert.equal(clamp01(-1), 0);
    assert.equal(clamp01(2), 1);
    assert.equal(clamp01(0.4), 0.4);
  });

  it('parses topic terms with aliases', () => {
    const terms = parseTopicTerms('federated learning medical imaging');
    assert.ok(terms.includes('federated learning'));
    assert.ok(terms.includes('medical imaging'));
  });

  it('dedupes papers by doi/title', () => {
    const papers = dedupeLivePapers([
      { id: '1', title: 'A', doi: '10.1/x', abstract: '', year: 2024, source: 'OpenAlex', authors: [], keywords: [], fields: [] },
      { id: '2', title: 'A', doi: '10.1/x', abstract: '', year: 2024, source: 'Crossref', authors: [], keywords: [], fields: [] },
      { id: '3', title: 'B', abstract: '', year: 2023, source: 'arXiv', authors: [], keywords: [], fields: [] },
    ]);
    assert.equal(papers.length, 2);
  });

  it('scores scarce strong pairs highly', () => {
    const scored = scoreCandidate({
      id: 'federated-learning__medical-imaging',
      field: 'Federated Learning',
      aspect: 'Medical Imaging',
      termA: 'federated learning',
      termB: 'medical imaging',
      directCount: 12,
      countA: 500,
      countB: 300,
      recentDirectCount: 8,
      oldDirectCount: 4,
      evidencePapers: [],
    }, { totalFetched: 150, sourceCount: 3 });

    assert.ok(scored.gapScore >= 60);
    assert.ok(['strong', 'potential'].includes(scored.level));
    assert.ok(scored.metrics.scarcityScore > 0.7);
  });
});
