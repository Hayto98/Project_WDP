const test = require('node:test');
const assert = require('node:assert/strict');

const { paperMatchesSubject } = require('../src/services/follow.service');

const paper = {
  title: 'Agent Harness Evaluation for Biomedical RAG',
  abstract: 'We evaluate retrieval augmented generation systems.',
  authors: [{ name: 'Minh Tran' }, { name: 'Lan Nguyen' }],
  keywords: ['RAG', 'Evaluation'],
  research_fields: ['Large Language Models', 'Biomedical NLP'],
};

test('matches followed keyword against title abstract keywords and fields', () => {
  assert.equal(paperMatchesSubject(paper, { type: 'Keyword', value: 'biomedical rag' }), true);
  assert.equal(paperMatchesSubject(paper, { type: 'Keyword', value: 'graph neural network' }), false);
});

test('matches followed field against paper research fields', () => {
  assert.equal(paperMatchesSubject(paper, { type: 'Field', value: 'large language models' }), true);
  assert.equal(paperMatchesSubject(paper, { type: 'Field', value: 'Biomedical' }), true);
  assert.equal(paperMatchesSubject(paper, { type: 'Field', value: 'Quantum' }), false);
});

test('matches followed author against paper authors', () => {
  assert.equal(paperMatchesSubject(paper, { type: 'Author', value: 'lan' }), true);
  assert.equal(paperMatchesSubject(paper, { type: 'Author', value: 'alice' }), false);
});
