const Paper = require('../models/Paper');
const PaperView = require('../models/PaperView');
const { shouldCountView, invalidateTopPapersCache } = require('../utils/viewDedup');
const { parsePagination } = require('../utils/pagination');
const redis = require('../config/redis');
const { ensureAbstracts } = require('./abstract.service');

/**
 * Search papers with full-text, filters, sorting (BR-009~012).
 */
async function searchPapers(query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = { status: { $ne: 'Archived' } };
  const andClauses = [];
  let usesTextSearch = false;
  const regexFor = (value) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const searchableFields = ['title', 'abstract', 'keywords', 'research_fields', 'authors.name'];
  const textLikeClause = (term) => ({
    $or: searchableFields.map((field) => ({ [field]: regexFor(term) })),
  });
  const fieldAliases = {
    'Large Language Models': [
      'large language model', 'llm', 'language model', 'generative ai',
      'retrieval-augmented generation', 'rag', 'prompt engineering', 'bert', 'gpt',
      'natural language processing', 'nlp', 'text generation',
    ],
    'Computer Vision': [
      'computer vision', 'image', 'visual', 'object detection', 'segmentation',
      'convolutional', 'cnn', 'vision transformer', 'remote sensing', 'medical image',
    ],
    'Federated Learning': [
      'federated learning', 'distributed learning', 'privacy-preserving', 'secure aggregation',
      'non-iid', 'edge federation',
    ],
    'Graph Neural Networks': [
      'graph neural network', 'gnn', 'graph convolution', 'graph representation',
      'graph learning', 'knowledge graph',
    ],
    'Quantum Machine Learning': [
      'quantum machine learning', 'quantum circuit', 'quantum computing',
      'variational quantum', 'qubit',
    ],
    'Edge & TinyML': [
      'edge', 'tinyml', 'on-device', 'embedded', 'mobile', 'iot', 'resource-constrained',
    ],
  };
  const fieldFilterClause = (fields) => {
    const terms = fields.flatMap((field) => [field, ...(fieldAliases[field] || [])]);
    return {
      $or: [
        { research_fields: { $in: fields } },
        ...terms.flatMap((term) => [
          { research_fields: regexFor(term) },
          { keywords: regexFor(term) },
          { title: regexFor(term) },
          { abstract: regexFor(term) },
        ]),
      ],
    };
  };

  // Full-text / scoped search
  if (query.q) {
    if (query.scope === 'title') {
      andClauses.push({ title: regexFor(query.q) });
    } else if (query.scope === 'author') {
      andClauses.push({ 'authors.name': regexFor(query.q) });
    } else {
      filter.$text = { $search: query.q };
      usesTextSearch = true;
    }
  }

  const andTerms = query.andTerms ? query.andTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const orTerms = query.orTerms ? query.orTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const notTerms = query.notTerms ? query.notTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];

  for (const term of andTerms) andClauses.push(textLikeClause(term));
  if (orTerms.length) andClauses.push({ $or: orTerms.map(textLikeClause) });
  for (const term of notTerms) andClauses.push({ $nor: [textLikeClause(term)] });

  // Field filters
  if (query.fields) {
    const fields = query.fields.split(',').map((f) => f.trim()).filter(Boolean);
    if (fields.length) andClauses.push(fieldFilterClause(fields));
  }
  if (query.sources) {
    const sources = query.sources.split(',').map((s) => s.trim());
    andClauses.push({
      $or: [
        { source_name: { $in: sources } },
        { 'sources.source_name': { $in: sources } },
      ],
    });
  }
  if (query.authors) {
    filter['authors.name'] = { $regex: query.authors, $options: 'i' };
  }
  if (query.yearFrom) {
    filter.publication_year = { ...filter.publication_year, $gte: parseInt(query.yearFrom, 10) };
  }
  if (query.yearTo) {
    filter.publication_year = { ...filter.publication_year, $lte: parseInt(query.yearTo, 10) };
  }
  if (query.types) {
    const types = query.types.split(',').map((t) => t.trim()).filter(Boolean);
    filter.type = { $in: types };
  } else if (query.type) {
    filter.type = query.type;
  }

  if (andClauses.length) {
    filter.$and = andClauses;
  }

  // Sort
  let sort = {};
  switch (query.sort) {
    case 'year_desc':
      sort = { publication_year: -1 };
      break;
    case 'year_asc':
      sort = { publication_year: 1 };
      break;
    case 'citations':
      sort = { citation_count: -1 };
      break;
    case 'relevance':
    default:
      if (usesTextSearch) {
        sort = { score: { $meta: 'textScore' }, publication_year: -1 };
      } else {
        sort = { publication_year: -1 };
      }
      break;
  }

  const projection = usesTextSearch ? { score: { $meta: 'textScore' } } : {};

  const [rawPapers, total] = await Promise.all([
    Paper.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
    Paper.countDocuments(filter),
  ]);
  const papers = await ensureAbstracts(rawPapers);

  return { papers, page, limit, total };
}

/**
 * Get paper by ID and record unique view (BR-043).
 */
async function getPaperById(paperId, userId, viewSource = 'Search_Result') {
  const paper = await Paper.findById(paperId).lean();
  if (!paper) {
    throw Object.assign(new Error('Paper not found'), { statusCode: 404 });
  }

  // Record unique view (dedup via Redis)
  if (userId) {
    const isNew = await shouldCountView(userId, paperId);
    if (isNew) {
      await PaperView.create({
        user_id: userId,
        paper_id: paperId,
        viewed_at: new Date(),
        source: viewSource,
      });
      invalidateTopPapersCache(); // async, no await
    }
  }

  return paper;
}

/**
 * Get trending papers — top by views in last N days (BR-044).
 */
async function getTrendingPapers(days = 30, limit = 10) {
  // Try Redis cache first
  if (redis) {
    try {
      const cached = await redis.get('top_papers:30d');
      if (cached) return JSON.parse(cached);
    } catch { /* ignore cache miss */ }
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const pipeline = [
    { $match: { viewed_at: { $gte: since } } },
    { $group: { _id: '$paper_id', views: { $sum: 1 } } },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'papers',
        localField: '_id',
        foreignField: '_id',
        as: 'paper',
      },
    },
    { $unwind: '$paper' },
    {
      $project: {
        _id: 0,
        paper_id: '$_id',
        views: 1,
        title: '$paper.title',
        authors: '$paper.authors',
        year: '$paper.publication_year',
        source: '$paper.source_name',
        field: { $arrayElemAt: ['$paper.research_fields', 0] },
        url: '$paper.original_url',
      },
    },
  ];

  const results = await PaperView.aggregate(pipeline);

  // Cache in Redis for 1 hour
  if (redis) {
    try {
      await redis.set('top_papers:30d', JSON.stringify(results), 'EX', 3600);
    } catch { /* ignore */ }
  }

  return results;
}

module.exports = { searchPapers, getPaperById, getTrendingPapers };
