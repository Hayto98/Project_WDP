const User = require('../models/User');
const DataSource = require('../models/DataSource');
const CrawlerJob = require('../models/CrawlerJob');
const SystemLog = require('../models/SystemLog');
const PaperView = require('../models/PaperView');
const Paper = require('../models/Paper');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { checkSourceApis } = require('../services/sourceHealth.service');
const { generateAllReports } = require('../services/report.service');
const { runCrawlerJob } = require('../services/scheduler.service');
const { broadcastSystemSignal } = require('../services/notification.service');

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

    const user = await User.findByIdAndUpdate(req.params.id, allowed, { returnDocument: 'after' })
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

    const source = await DataSource.findByIdAndUpdate(req.params.id, allowed, { returnDocument: 'after' });
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
    const { name, source_name, query, max_records } = req.body;
    const source = await DataSource.findOne({ name: source_name }).lean();
    const job = await CrawlerJob.create({
      name,
      source_id: source?._id,
      source_name,
      query,
      max_records: max_records || 25,
      status: 'queued',
      progress: 0,
      owner: req.user.email,
      requested_by: req.user.id,
    });
    return ApiResponse.created(res, job);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function runJob(req, res) {
  try {
    const job = await CrawlerJob.findById(req.params.id);
    if (!job) return ApiResponse.notFound(res, 'Crawler job not found');
    if (job.status === 'running') {
      return ApiResponse.error(res, 'Job is already running', 409, 'JOB_RUNNING');
    }
    if (!job.query) {
      return ApiResponse.validationError(res, 'Job query is required before running sync');
    }

    const finishedJob = await runCrawlerJob(job);
    return ApiResponse.success(res, finishedJob);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function refreshReports(_req, res) {
  try {
    const result = await generateAllReports();
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
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

async function broadcastNotification(req, res) {
  try {
    const result = await broadcastSystemSignal({
      title: req.body.title,
      content: req.body.content,
      priority: req.body.priority,
      actorName: req.user?.full_name || req.user?.email || 'Admin',
    });
    return ApiResponse.created(res, {
      message: `Đã gửi tín hiệu tới ${result.sent} người dùng`,
      sent: result.sent,
    });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getUsers, updateUser,
  getDataSources, updateDataSource, checkDataSourceApis,
  getJobs, createJob, runJob,
  refreshReports,
  getAuditLogs,
  getPaperReads,
  getStats,
  broadcastNotification,
};
