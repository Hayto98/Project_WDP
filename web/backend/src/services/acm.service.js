const { findOriginalAbstractWithLlm } = require('./abstract.service');
const { fetchCrossrefWorks, mapItemToPaper } = require('./crossref.service');
const { cleanText, normalizeTitle, upsertCleanPaper } = require('./paperCleaning.service');

function mapAcmItemToPaper(item) {
  const paper = mapItemToPaper(item);
  const externalId = item.DOI || item.URL || normalizeTitle(paper.title);

  return {
    ...paper,
    source_name: 'ACM Digital Library',
    original_url: item.URL || (item.DOI ? `https://dl.acm.org/doi/${item.DOI}` : paper.original_url),
    keywords: paper.keywords.length ? paper.keywords : ['ACM Digital Library'],
    research_fields: paper.research_fields.length ? paper.research_fields : ['Computer Science'],
    sources: [{
      source_name: 'ACM Digital Library',
      external_id: cleanText(externalId, 500),
      fetched_at: new Date(),
    }],
  };
}

async function fetchAcmWorks(query, maxRecords = 25, options = {}) {
  const acmQuery = `${query} ACM`;
  return fetchCrossrefWorks(acmQuery, maxRecords, options);
}

async function importAcmByQuery(query, maxRecords = 25, options = {}) {
  const { total, items } = await fetchAcmWorks(query, maxRecords, options);
  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const publisher = String(item.publisher || item.member || '').toLowerCase();
    const container = JSON.stringify(item['container-title'] || '').toLowerCase();
    const url = String(item.URL || item.DOI || '').toLowerCase();
    const looksAcm = publisher.includes('association for computing machinery')
      || publisher.includes('acm')
      || container.includes('acm')
      || url.includes('dl.acm.org')
      || url.includes('10.1145/');
    if (!looksAcm) {
      skipped += 1;
      continue;
    }

    const paper = mapAcmItemToPaper(item);
    if (!paper.abstract) {
      paper.abstract = await findOriginalAbstractWithLlm(paper);
    }
    const outcome = await upsertCleanPaper(paper);
    if (outcome.imported) imported += 1;
    if (outcome.skipped) skipped += 1;
  }

  return { imported, skipped, sourceTotal: total };
}

module.exports = {
  fetchAcmWorks,
  importAcmByQuery,
  mapAcmItemToPaper,
};
