const paperService = require('../services/paper.service');
const ApiResponse = require('../utils/apiResponse');
const CrawlerJob = require('../models/CrawlerJob');
const DataSource = require('../models/DataSource');
const { importOpenAlexByQuery } = require('../services/openalex.service');
const { importArxivByQuery } = require('../services/arxiv.service');
const { importCrossrefByQuery } = require('../services/crossref.service');
const { importExaByQuery } = require('../services/exa.service');
const { importSemanticScholarByQuery } = require('../services/semanticScholar.service');
const { importAcmByQuery } = require('../services/acm.service');
const { logAction } = require('../utils/systemLogger');
const { notifyJobComplete } = require('../services/notification.service');

const IMMEDIATE_SYNC_SOURCES = ['OpenAlex', 'Semantic Scholar', 'arXiv', 'Crossref', 'ACM Digital Library', 'Exa'];

const SOURCE_ENDPOINTS = {
  OpenAlex: 'https://api.openalex.org',
  'Semantic Scholar': 'https://api.semanticscholar.org',
  Crossref: 'https://api.crossref.org',
  arXiv: 'https://export.arxiv.org/api',
  'IEEE Xplore': 'https://ieeexploreapi.ieee.org',
  'ACM Digital Library': 'https://dl.acm.org',
  Exa: 'https://api.exa.ai',
};

async function search(req, res) {
  try {
    const { papers, page, limit, total } = await paperService.searchPapers(req.query, req.user?.id || null);
    return ApiResponse.paginated(res, papers, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getById(req, res) {
  try {
    const paper = await paperService.getPaperById(
      req.params.id,
      req.user?.id,
      req.query.source || 'Search_Result',
    );
    return ApiResponse.success(res, paper);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getTrending(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 10;
    const results = await paperService.getTrendingPapers(days, limit);
    return ApiResponse.success(res, results);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function requestCorpusSync(req, res) {
  try {
    const { query, sourceName = 'OpenAlex', maxRecords = 25 } = req.body;
    const syncFilters = {
      yearFrom: req.body.yearFrom,
      yearTo: req.body.yearTo,
      types: req.body.types,
    };

    const source = await DataSource.findOne({ name: sourceName }).lean();
    const existing = await CrawlerJob.findOne({
      source_name: sourceName,
      query,
      status: { $in: ['queued', 'running'] },
    });

    if (existing) {
      const staleAfterMs = 2 * 60 * 1000;
      const startedAt = existing.started_at || existing.created_at;
      const isStale = startedAt && (Date.now() - new Date(startedAt).getTime() > staleAfterMs);
      if (!isStale) {
        return ApiResponse.success(res, existing, 200);
      }
      existing.status = 'failed';
      existing.progress = 100;
      existing.completed_at = new Date();
      existing.error_message = 'Stale sync job was replaced by a new request';
      await existing.save();
    }

    const previousJobs = await CrawlerJob.find({
      source_name: sourceName,
      query,
      status: { $in: ['success', 'warning'] },
    }).select('max_records').lean();
    const previousFetched = previousJobs.reduce((sum, job) => sum + (job.max_records || maxRecords), 0);
    const syncPage = Math.floor(previousFetched / maxRecords) + 1;
    const now = new Date();
    const job = await CrawlerJob.create({
      name: `${sourceName} sync: ${query}`,
      source_id: source?._id,
      source_name: sourceName,
      status: IMMEDIATE_SYNC_SOURCES.includes(sourceName) ? 'running' : 'queued',
      progress: IMMEDIATE_SYNC_SOURCES.includes(sourceName) ? 10 : 0,
      query,
      max_records: maxRecords,
      requested_by: req.user?.id || null,
      owner: req.user?.email || 'Guest Search',
      started_at: IMMEDIATE_SYNC_SOURCES.includes(sourceName) ? now : undefined,
    });

    if (IMMEDIATE_SYNC_SOURCES.includes(sourceName)) {
      try {
        let result;
        if (sourceName === 'arXiv') {
          result = await importArxivByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        } else if (sourceName === 'Crossref') {
          result = await importCrossrefByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        } else if (sourceName === 'Semantic Scholar') {
          result = await importSemanticScholarByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        } else if (sourceName === 'ACM Digital Library') {
          result = await importAcmByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        } else if (sourceName === 'Exa') {
          result = await importExaByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        } else {
          result = await importOpenAlexByQuery(query, maxRecords, { ...syncFilters, page: syncPage });
        }
        const completedAt = new Date();
        job.status = 'success';
        job.progress = 100;
        job.records_processed = result.imported;
        job.completed_at = completedAt;
        job.duration_seconds = Math.max(1, Math.round((completedAt - now) / 1000));
        job.result = {
          imported: result.imported,
          skipped: result.skipped,
          source_total: result.sourceTotal,
        };
        await job.save();
        logAction('BatchJob', req.user?.id || null, sourceName, {
          query,
          maxRecords,
          imported: result.imported,
          skipped: result.skipped,
          sourceTotal: result.sourceTotal,
        });
        notifyJobComplete(req.user?.id, job);
      } catch (err) {
        job.status = 'failed';
        job.progress = 100;
        job.completed_at = new Date();
        job.duration_seconds = Math.max(1, Math.round((job.completed_at - now) / 1000));
        job.error_message = err.message;
        await job.save();
        logAction('BatchJob', req.user?.id || null, sourceName, {
          query,
          maxRecords,
          success: false,
          error: err.message,
        });
        notifyJobComplete(req.user?.id, job);
        throw err;
      }
    }

    return ApiResponse.created(res, job);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = { search, getById, getTrending, requestCorpusSync };
