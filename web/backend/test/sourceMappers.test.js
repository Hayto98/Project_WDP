const test = require('node:test');
const assert = require('node:assert/strict');

const { mapWorkToPaper } = require('../src/services/openalex.service');
const { mapItemToPaper } = require('../src/services/crossref.service');
const { mapEntryToPaper } = require('../src/services/arxiv.service');
const { mapArticleToPaper } = require('../src/services/ieee.service');
const { mapSemanticPaperToPaper } = require('../src/services/semanticScholar.service');
const { mapAcmItemToPaper } = require('../src/services/acm.service');

test('maps OpenAlex work into Paper payload', () => {
  const paper = mapWorkToPaper({
    id: 'https://openalex.org/W1',
    doi: 'https://doi.org/10.1000/openalex',
    title: 'OpenAlex Agent Harness',
    publication_year: 2025,
    publication_date: '2025-03-15',
    type: 'article',
    cited_by_count: 12,
    abstract_inverted_index: { Agent: [0], harness: [1] },
    concepts: [{ display_name: 'AI Evaluation', score: 0.9 }],
    authorships: [{ author: { display_name: 'Minh Tran' } }],
    primary_location: { landing_page_url: 'https://example.com/openalex' },
  });

  assert.equal(paper.source_name, 'OpenAlex');
  assert.equal(paper.doi, '10.1000/openalex');
  assert.equal(paper.abstract, 'Agent harness');
  assert.equal(paper.type, 'Journal');
  assert.equal(paper.publication_month, 3);
  assert.deepEqual(paper.research_fields, ['AI Evaluation']);
});

test('maps Crossref item into Paper payload', () => {
  const paper = mapItemToPaper({
    DOI: '10.1000/crossref',
    title: ['<b>Crossref Harness</b>'],
    abstract: '<p>Structured abstract</p>',
    type: 'proceedings-article',
    subject: ['Software Engineering', 'AI'],
    author: [{ given: 'Minh', family: 'Tran' }],
    published: { 'date-parts': [[2024, 11]] },
    URL: 'https://doi.org/10.1000/crossref',
    'is-referenced-by-count': 7,
  });

  assert.equal(paper.source_name, 'Crossref');
  assert.equal(paper.type, 'Conference');
  assert.equal(paper.publication_year, 2024);
  assert.equal(paper.publication_month, 11);
  assert.equal(paper.authors[0].name, 'Minh Tran');
  assert.deepEqual(paper.keywords, ['Software Engineering', 'AI']);
});

test('maps arXiv entry into Paper payload', () => {
  const entry = `
    <id>https://arxiv.org/abs/2601.00001</id>
    <published>2026-01-02T00:00:00Z</published>
    <title>arXiv Agent Harness</title>
    <summary>Preprint abstract</summary>
    <author><name>Minh Tran</name></author>
    <category term="cs.SE" />
  `;
  const paper = mapEntryToPaper(entry);

  assert.equal(paper.source_name, 'arXiv');
  assert.equal(paper.type, 'Preprint');
  assert.equal(paper.publication_year, 2026);
  assert.equal(paper.publication_month, 1);
  assert.equal(paper.authors[0].name, 'Minh Tran');
  assert.deepEqual(paper.keywords, ['cs.SE']);
});

test('maps IEEE article into Paper payload', () => {
  const paper = mapArticleToPaper({
    doi: '10.1109/example',
    title: 'IEEE Harness Evaluation',
    publication_year: 2025,
    publication_month: 5,
    publication_title: 'IEEE Conference on Software Engineering',
    abstract: 'Evaluation abstract',
    html_url: 'https://ieeexplore.ieee.org/document/1',
    citation_count: 9,
    authors: { authors: [{ full_name: 'Minh Tran' }] },
    index_terms: { author_terms: { terms: ['LLM', 'Testing'] } },
  }, 'large language model testing');

  assert.equal(paper.source_name, 'IEEE Xplore');
  assert.equal(paper.type, 'Conference');
  assert.equal(paper.publication_month, 5);
  assert.equal(paper.authors[0].name, 'Minh Tran');
  assert.deepEqual(paper.research_fields, ['Large Language Models']);
});

test('maps Semantic Scholar paper into Paper payload', () => {
  const paper = mapSemanticPaperToPaper({
    paperId: 'S2-123',
    title: 'Semantic Scholar Agent Harness',
    abstract: 'Semantic abstract',
    year: 2026,
    citationCount: 15,
    venue: 'Journal of Agent Systems',
    externalIds: { DOI: '10.5555/s2' },
    url: 'https://www.semanticscholar.org/paper/S2-123',
    authors: [{ name: 'Minh Tran' }],
    fieldsOfStudy: ['Computer Science'],
    s2FieldsOfStudy: [{ category: 'Artificial Intelligence' }],
  });

  assert.equal(paper.source_name, 'Semantic Scholar');
  assert.equal(paper.doi, '10.5555/s2');
  assert.equal(paper.type, 'Journal');
  assert.equal(paper.publication_year, 2026);
  assert.equal(paper.citation_count, 15);
  assert.equal(paper.authors[0].name, 'Minh Tran');
  assert.ok(paper.research_fields.includes('Computer Science'));
});

test('maps ACM/Crossref item into ACM Digital Library payload', () => {
  const paper = mapAcmItemToPaper({
    DOI: '10.1145/1234567',
    title: ['ACM Agent Harness'],
    abstract: '<p>ACM abstract</p>',
    type: 'proceedings-article',
    publisher: 'Association for Computing Machinery',
    subject: ['Software Engineering'],
    author: [{ given: 'Minh', family: 'Tran' }],
    published: { 'date-parts': [[2025, 7]] },
    URL: 'https://dl.acm.org/doi/10.1145/1234567',
  });

  assert.equal(paper.source_name, 'ACM Digital Library');
  assert.equal(paper.sources[0].source_name, 'ACM Digital Library');
  assert.equal(paper.type, 'Conference');
  assert.equal(paper.publication_year, 2025);
  assert.equal(paper.original_url, 'https://dl.acm.org/doi/10.1145/1234567');
});
