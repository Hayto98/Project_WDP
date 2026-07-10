const User = require('../models/User');
const DataSource = require('../models/DataSource');
const CrawlerJob = require('../models/CrawlerJob');
const SystemLog = require('../models/SystemLog');
const PaperView = require('../models/PaperView');
const Paper = require('../models/Paper');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { importIEEEByQuery } = require('../services/ieee.service');
const { importOpenAlexByQuery } = require('../services/openalex.service');
const { importArxivByQuery } = require('../services/arxiv.service');
const { importCrossrefByQuery } = require('../services/crossref.service');
const { checkSourceApis } = require('../services/sourceHealth.service');

// ── Users ──

async function getUsers(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.role) filter.roles = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash').skip(skip).limit(limit).sort({ created_at: -1 }).lean(),
      User.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, users, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function updateUser(req, res) {
  try {
    const allowed = {};
    if (req.body.status) allowed.status = req.body.status;
    if (req.body.roles) allowed.roles = req.body.roles;

    const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true })
      .select('-password_hash');
    if (!user) return ApiResponse.notFound(res);
    return ApiResponse.success(res, user);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Data Sources ──

async function getDataSources(req, res) {
  try {
    const sources = await DataSource.find().sort({ name: 1 }).lean();
    return ApiResponse.success(res, sources);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function updateDataSource(req, res) {
  try {
    const allowed = {};
    if (req.body.enabled !== undefined) allowed.enabled = req.body.enabled;
    if (req.body.sync_schedule) allowed.sync_schedule = req.body.sync_schedule;
    if (req.body.api_endpoint) allowed.api_endpoint = req.body.api_endpoint;

    const source = await DataSource.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!source) return ApiResponse.notFound(res);
    return ApiResponse.success(res, source);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function checkDataSourceApis(_req, res) {
  try {
    const results = await checkSourceApis();
    return ApiResponse.success(res, results);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Crawler Jobs ──

async function getJobs(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const jobs = await CrawlerJob.find(filter).sort({ created_at: -1 }).limit(50).lean();
    return ApiResponse.success(res, jobs);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function createJob(req, res) {
  try {
    const job = await CrawlerJob.create(req.body);
    return ApiResponse.created(res, job);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function runJob(req, res) {
  const startedAt = new Date();
  try {
    const job = await CrawlerJob.findById(req.params.id);
    if (!job) return ApiResponse.notFound(res, 'Crawler job not found');
    if (job.status === 'running') {
      return ApiResponse.error(res, 'Job is already running', 409, 'JOB_RUNNING');
    }
    if (!['OpenAlex', 'arXiv', 'Crossref', 'IEEE Xplore'].includes(job.source_name)) {
      return ApiResponse.error(res, `Unsupported sync source: ${job.source_name}`, 400, 'UNSUPPORTED_SOURCE');
    }
    if (!job.query) {
      return ApiResponse.validationError(res, 'Job query is required before running sync');
    }

    job.status = 'running';
    job.progress = 10;
    job.started_at = startedAt;
    job.completed_at = undefined;
    job.error_message = null;
    await job.save();

    let result;
    if (job.source_name === 'OpenAlex') {
      result = await importOpenAlexByQuery(job.query, job.max_records);
    } else if (job.source_name === 'arXiv') {
      result = await importArxivByQuery(job.query, job.max_records);
    } else if (job.source_name === 'Crossref') {
      result = await importCrossrefByQuery(job.query, job.max_records);
    } else {
      result = await importIEEEByQuery(job.query, job.max_records);
    }
    const completedAt = new Date();
    job.status = 'success';
    job.progress = 100;
    job.records_processed = result.imported;
    job.completed_at = completedAt;
    job.duration_seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
    job.result = {
      imported: result.imported,
      skipped: result.skipped,
      source_total: result.sourceTotal,
    };
    await job.save();

    return ApiResponse.success(res, job);
  } catch (err) {
    await CrawlerJob.findByIdAndUpdate(req.params.id, {
      status: 'failed',
      progress: 100,
      completed_at: new Date(),
      duration_seconds: Math.max(1, Math.round((new Date() - startedAt) / 1000)),
      error_message: err.message,
    });
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

// ── Audit Logs ──

async function getAuditLogs(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.severity) filter['details.severity'] = req.query.severity;
    if (req.query.actor) filter['details.actor'] = { $regex: req.query.actor, $options: 'i' };

    const [logs, total] = await Promise.all([
      SystemLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      SystemLog.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, logs, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Paper Read Logs (admin view of paper_views) ──

async function getPaperReads(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.paperId) filter.paper_id = req.query.paperId;

    const [views, total] = await Promise.all([
      PaperView.find(filter)
        .populate('user_id', 'full_name email')
        .populate('paper_id', 'title source_name')
        .sort({ viewed_at: -1 })
        .skip(skip).limit(limit).lean(),
      PaperView.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, views, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Stats ──

async function getStats(req, res) {
  try {
    const [totalPapers, totalUsers, activeJobs, dataSources] = await Promise.all([
      Paper.countDocuments({ status: { $ne: 'Archived' } }),
      User.countDocuments({ status: 'Active' }),
      CrawlerJob.countDocuments({ status: { $in: ['running', 'queued'] } }),
      DataSource.countDocuments({ enabled: true }),
    ]);

    return ApiResponse.success(res, { totalPapers, totalUsers, activeJobs, dataSources });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = {
  getUsers, updateUser,
  getDataSources, updateDataSource, checkDataSourceApis,
  getJobs, createJob, runJob,
  getAuditLogs,
  getPaperReads,
  getStats,
};
