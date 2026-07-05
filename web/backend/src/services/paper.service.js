const Paper = require('../models/Paper');
const PaperView = require('../models/PaperView');
const { shouldCountView, invalidateTopPapersCache } = require('../utils/viewDedup');
const { parsePagination } = require('../utils/pagination');
const redis = require('../config/redis');

/**
 * Search papers with full-text, filters, sorting (BR-009~012).
 */
async function searchPapers(query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = { status: { $ne: 'Archived' } };

  // Full-text search
  if (query.q) {
    filter.$text = { $search: query.q };
  }

  // Field filters
  if (query.fields) {
    const fields = query.fields.split(',').map((f) => f.trim());
    filter.research_fields = { $in: fields };
  }
  if (query.sources) {
    const sources = query.sources.split(',').map((s) => s.trim());
    filter.source_name = { $in: sources };
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
  if (query.type) {
    filter.type = query.type;
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
      if (query.q) {
        sort = { score: { $meta: 'textScore' }, publication_year: -1 };
      } else {
        sort = { publication_year: -1 };
      }
      break;
  }

  const projection = query.q ? { score: { $meta: 'textScore' } } : {};

  const [papers, total] = await Promise.all([
    Paper.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
    Paper.countDocuments(filter),
  ]);

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
