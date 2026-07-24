const Paper = require('../models/Paper');
const PaperView = require('../models/PaperView');
const { shouldCountView, invalidateTopPapersCache } = require('../utils/viewDedup');
const { parsePagination } = require('../utils/pagination');
const redis = require('../config/redis');
const { ensureAbstracts } = require('./abstract.service');
const { logAction } = require('../utils/systemLogger');

/**
 * Search papers with full-text, filters, sorting (BR-009~012).
 */
async function searchPapers(query, userId = null) {
  const { page, limit, skip } = parsePagination(query);

  const filter = { status: { $ne: 'Archived' } };
  const andClauses = [];
  let usesTextSearch = false;
  const escapeRegex = (value) => String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Contiguous phrase: "machine learning" must appear in order, not as separate tokens.
  const phraseParts = (value) =>
    String(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(escapeRegex);
  const phrasePattern = (value) => {
    const parts = phraseParts(value);
    if (!parts.length) return null;
    if (parts.length === 1) return parts[0];
    return `\\b${parts.join('\\s+')}\\b`;
  };
  const phraseRegex = (value) => {
    const pattern = phrasePattern(value);
    return pattern ? new RegExp(pattern, 'i') : null;
  };
  const regexFor = (value) => phraseRegex(value) || new RegExp('a^'); // never-match fallback
  // Main query matches content the user can see — not research_fields alone
  // (e.g. field "Quantum Machine Learning" must not pull titles that only say "Learning").
  const contentFields = ['title', 'abstract', 'keywords', 'authors.name'];
  const searchableFields = [...contentFields, 'research_fields'];
  const textLikeClause = (term, fields = searchableFields) => ({
    $or: fields.map((field) => ({ [field]: regexFor(term) })),
  });
  let phraseQuery = '';
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
    // Strip wrapping quotes; multi-word queries must match as a contiguous phrase
    // so "machine learning" does not match papers that only contain "learning".
    const cleanedQuery = String(query.q).trim().replace(/^"+|"+$/g, '').trim();
    const isMultiWord = /\s/.test(cleanedQuery);

    if (query.scope === 'title') {
      andClauses.push({ title: regexFor(cleanedQuery) });
    } else if (query.scope === 'author') {
      andClauses.push({ 'authors.name': regexFor(cleanedQuery) });
    } else if (isMultiWord) {
      phraseQuery = cleanedQuery;
      andClauses.push(textLikeClause(cleanedQuery, contentFields));
    } else {
      // Quoted phrase form forces Mongo text index to treat the token as one term unit.
      filter.$text = { $search: `"${cleanedQuery.replace(/"/g, '')}"` };
      usesTextSearch = true;
    }
  }

  const andTerms = query.andTerms ? query.andTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const orTerms = query.orTerms ? query.orTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const notTerms = query.notTerms ? query.notTerms.split(',').map((t) => t.trim()).filter(Boolean) : [];

  for (const term of andTerms) {
    andClauses.push(textLikeClause(term, /\s/.test(term) ? contentFields : searchableFields));
  }
  if (orTerms.length) {
    andClauses.push({
      $or: orTerms.map((term) => textLikeClause(term, /\s/.test(term) ? contentFields : searchableFields)),
    });
  }
  for (const term of notTerms) {
    andClauses.push({
      $nor: [textLikeClause(term, /\s/.test(term) ? contentFields : searchableFields)],
    });
  }

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
  const preferTitlePhrase =
    Boolean(phraseQuery) &&
    (query.sort === 'relevance' || !query.sort);

  let rawPapers;
  let total;
  if (preferTitlePhrase) {
    const titlePattern = phrasePattern(phraseQuery);
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          _titleHit: titlePattern
            ? { $regexMatch: { input: { $ifNull: ['$title', ''] }, regex: titlePattern, options: 'i' } }
            : false,
        },
      },
      { $sort: { _titleHit: -1, publication_year: -1, _id: 1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }, { $project: { _titleHit: 0 } }],
          count: [{ $count: 'total' }],
        },
      },
    ];
    const [facet] = await Paper.aggregate(pipeline);
    rawPapers = facet?.items || [];
    total = facet?.count?.[0]?.total || 0;
  } else {
    [rawPapers, total] = await Promise.all([
      Paper.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
      Paper.countDocuments(filter),
    ]);
  }
  const papers = await ensureAbstracts(rawPapers);

  logAction('Search', userId, null, {
    query: query.q || '',
    filters: {
      fields: query.fields,
      sources: query.sources,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      types: query.types || query.type,
    },
    resultsCount: total,
  });

  return { papers, page, limit, total };
}

/**
 * Get paper by ID and record unique view (BR-043).
 */
async function getPaperById(paperId, userId, viewSource = 'Search_Result', trackView = true) {
  const paper = await Paper.findById(paperId).lean();
  if (!paper) {
    throw Object.assign(new Error('Paper not found'), { statusCode: 404 });
  }

  // Record unique view (dedup via Redis)
  if (userId && trackView) {
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

const READING_THRESHOLD_SECONDS = 120;
const MAX_READING_SECONDS = 12 * 60 * 60;
const VIEW_SOURCES = new Set(['Search_Result', 'Library', 'Recommendation', 'Dashboard']);

function sessionWindow(date) {
  const hour = date.getHours();
  const minute = date.getMinutes() < 30 ? 0 : 30;
  const endHour = minute === 30 ? hour + 1 : hour;
  const endMinute = minute === 30 ? 0 : 30;
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}-${pad(endHour % 24)}:${pad(endMinute)}`;
}

/**
 * Start an authenticated in-app reading session.
 * This is separate from the legacy external-source view ping so dwell time can
 * be updated while the dedicated detail page remains visible.
 */
async function startReadingSession(paperId, userId, source = 'Search_Result', device = 'desktop') {
  const paper = await Paper.findById(paperId).select('_id').lean();
  if (!paper) {
    throw Object.assign(new Error('Paper not found'), { statusCode: 404 });
  }

  const startedAt = new Date();
  const view = await PaperView.create({
    user_id: userId,
    paper_id: paperId,
    viewed_at: startedAt,
    source: VIEW_SOURCES.has(source) ? source : 'Search_Result',
    duration_minutes: 0,
    duration_seconds: 0,
    session_window: sessionWindow(startedAt),
    device: ['desktop', 'tablet', 'mobile'].includes(device) ? device : 'desktop',
    persist_status: 'queued',
    reason: 'Đang đọc',
  });

  invalidateTopPapersCache();
  return {
    viewId: view._id.toString(),
    startedAt,
    thresholdSeconds: READING_THRESHOLD_SECONDS,
  };
}

/**
 * Update active dwell time. Heartbeats keep a session useful even when the
 * browser closes before the final request; finalized sessions receive the
 * existing two-minute stored/skipped classification used by Admin analytics.
 */
async function updateReadingSession(paperId, viewId, userId, durationSeconds, finalized = false) {
  const seconds = Math.min(
    MAX_READING_SECONDS,
    Math.max(0, Math.round(Number(durationSeconds) || 0)),
  );
  const update = {
    duration_seconds: seconds,
    duration_minutes: Number((seconds / 60).toFixed(2)),
  };

  if (finalized) {
    update.ended_at = new Date();
    update.persist_status = seconds >= READING_THRESHOLD_SECONDS ? 'stored' : 'skipped';
    update.reason = seconds >= READING_THRESHOLD_SECONDS ? 'Đủ ngưỡng đọc' : 'Dưới ngưỡng đọc';
  }

  const view = await PaperView.findOneAndUpdate(
    {
      _id: viewId,
      paper_id: paperId,
      user_id: userId,
    },
    { $set: update },
    { returnDocument: 'after' },
  ).lean();

  if (!view) {
    throw Object.assign(new Error('Reading session not found'), { statusCode: 404 });
  }

  return {
    viewId: view._id.toString(),
    durationSeconds: view.duration_seconds,
    durationMinutes: view.duration_minutes,
    finalized: Boolean(view.ended_at),
    persistStatus: view.persist_status,
  };
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

module.exports = {
  searchPapers,
  getPaperById,
  getTrendingPapers,
  startReadingSession,
  updateReadingSession,
};
