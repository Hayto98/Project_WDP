const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanText,
  normalizeDoi,
  normalizeTitle,
  preparePaper,
  uniqueStrings,
} = require('../src/services/paperCleaning.service');

test('normalizes paper title for dedupe', () => {
  assert.equal(normalizeTitle('  AI-Harness:   A Study! '), 'ai harness a study');
});

test('normalizes DOI from URL and doi prefix', () => {
  assert.equal(normalizeDoi('https://doi.org/10.1234/ABC.5'), '10.1234/ABC.5');
  assert.equal(normalizeDoi('doi: 10.5555/example'), '10.5555/example');
});

test('cleans html-ish text and trims length', () => {
  assert.equal(cleanText('<p>A&amp;B</p>   <b>test</b>', 20), 'A&B test');
});

test('dedupes keyword strings case-insensitively', () => {
  assert.deepEqual(uniqueStrings(['LLM', ' llm ', 'Evaluation', '', 'Evaluation'], 5), ['LLM', 'Evaluation']);
});

test('prepares valid paper as cleaned', () => {
  const paper = preparePaper({
    title: 'AI Harness for Software Agents',
    abstract: '<p>Evaluation workflow.</p>',
    publication_year: '2025',
    citation_count: '-3',
    original_url: 'https://example.com/paper',
    authors: ['Minh Tran'],
    keywords: ['AI', 'AI', 'Harness'],
    sources: [{ source_name: 'Exa', external_id: 'x1', fetched_at: new Date() }],
  });

  assert.equal(paper.status, 'Cleaned');
  assert.equal(paper.title_normalized, 'ai harness for software agents');
  assert.equal(paper.citation_count, 0);
  assert.deepEqual(paper.authors, [{ name: 'Minh Tran', is_primary: true }]);
  assert.deepEqual(paper.keywords, ['AI', 'Harness']);
});

test('marks paper without usable title as rejected', () => {
  const paper = preparePaper({ title: '   ', original_url: 'https://example.com' });
  assert.equal(paper.status, 'Rejected');
});
