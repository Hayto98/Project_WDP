const test = require('node:test');
const assert = require('node:assert/strict');

const { mapResultToPaper } = require('../src/services/exa.service');

test('maps Exa search result into cleaned Paper payload', () => {
  const paper = mapResultToPaper({
    id: 'https://doi.org/10.1234/agent.2025',
    title: 'AI Harnesses for Agent Evaluation',
    url: 'https://doi.org/10.1234/agent.2025',
    publishedDate: '2025-04-10',
    author: 'Minh Tran',
    highlights: ['Harnesses evaluate agent behavior.'],
  });

  assert.equal(paper.source_name, 'Exa');
  assert.equal(paper.doi, '10.1234/agent.2025');
  assert.equal(paper.publication_year, 2025);
  assert.equal(paper.publication_month, 4);
  assert.equal(paper.type, 'Journal');
  assert.equal(paper.authors[0].name, 'Minh Tran');
  assert.equal(paper.sources[0].source_name, 'Exa');
  assert.ok(paper.keywords.includes('harnesses'));
});

test('falls back to preprint type when Exa result has no journal/conference signal', () => {
  const paper = mapResultToPaper({
    title: 'Emerging Agent Benchmarks',
    url: 'https://example.com/benchmarks',
    text: 'Benchmark overview',
  });

  assert.equal(paper.type, 'Preprint');
  assert.equal(paper.publication_year, new Date().getFullYear());
});
