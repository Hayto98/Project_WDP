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
const { importIEEEByQuery } = require('../services/ieee.service');
const { logAction } = require('../utils/systemLogger');
const { notifyJobComplete } = require('../services/notification.service');

const IMMEDIATE_SYNC_SOURCES = ['OpenAlex', 'Semantic Scholar', 'arXiv', 'Crossref', 'IEEE Xplore', 'ACM Digital Library', 'Exa'];

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
      req.query.track !== 'false',
    );
    return ApiResponse.success(res, paper);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function startReadingSession(req, res) {
  try {
    const session = await paperService.startReadingSession(
      req.params.id,
      req.user.id,
      req.body.source,
      req.body.device,
    );
    return ApiResponse.created(res, session);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updateReadingSession(req, res) {
  try {
    const session = await paperService.updateReadingSession(
      req.params.id,
      req.params.viewId,
      req.user.id,
      req.body.durationSeconds,
      req.body.finalized === true,
    );
    return ApiResponse.success(res, session);
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

async function listSources(_req, res) {
  try {
    const rows = await DataSource.find()
      .select('name enabled last_error last_sync_status')
      .sort({ name: 1 })
      .lean();
    const payload = rows.map((row) => {
      const enabled = row.enabled !== false;
      return {
        name: row.name,
        enabled,
        status: enabled
          ? (row.last_sync_status === 'Failed' ? 'degraded' : 'active')
          : 'paused',
        message: enabled
          ? null
          : `Nguồn ${row.name} đang tạm dừng bởi quản trị viên. Không thể tải thêm bài báo từ nguồn này.`,
      };
    });
    return ApiResponse.success(res, payload);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
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
    if (source && source.enabled === false) {
      return ApiResponse.error(
        res,
        `Nguồn ${sourceName} đang tạm dừng bởi quản trị viên. Vui lòng chọn nguồn khác hoặc liên hệ admin để bật lại.`,
        403,
      );
    }
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
    }).select('max_records result').lean();

    // Count what was actually retrieved — never assume max_records were returned.
    // Otherwise a 4-hit OpenAlex query still advances to page 2/3 and looks empty
    // even though openalex.org shows the paper.
    let previousFetched = 0;
    let sourceExhausted = false;
    for (const job of previousJobs) {
      const imported = Number(job.result?.imported || 0);
      const skipped = Number(job.result?.skipped || 0);
      const got = imported + skipped;
      const sourceTotal = Number(job.result?.source_total);
      const requested = job.max_records || maxRecords;
      if (got > 0) previousFetched += got;
      else if (Number.isFinite(sourceTotal) && sourceTotal >= 0) previousFetched += Math.min(sourceTotal, requested);
      if (Number.isFinite(sourceTotal) && sourceTotal <= requested) sourceExhausted = true;
      if (got > 0 && got < requested) sourceExhausted = true;
    }
    // If prior syncs already covered the full source result set, refresh page 1
    // (duplicates will be skipped) instead of requesting an empty next page.
    const syncPage = sourceExhausted ? 1 : Math.floor(previousFetched / maxRecords) + 1;
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
        } else if (sourceName === 'IEEE Xplore') {
          result = await importIEEEByQuery(query, maxRecords);
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
          imported_papers: Array.isArray(result.importedPapers)
            ? result.importedPapers.slice(0, 10)
            : [],
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

module.exports = {
  search,
  getById,
  startReadingSession,
  updateReadingSession,
  getTrending,
  listSources,
  requestCorpusSync,
};
