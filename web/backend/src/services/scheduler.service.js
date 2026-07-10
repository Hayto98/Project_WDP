const CrawlerJob = require('../models/CrawlerJob');
const DataSource = require('../models/DataSource');
const { importIEEEByQuery } = require('./ieee.service');
const { importOpenAlexByQuery } = require('./openalex.service');
const { importArxivByQuery } = require('./arxiv.service');
const { importCrossrefByQuery } = require('./crossref.service');
const { generateAllReports } = require('./report.service');
const { notifyJobComplete } = require('./notification.service');
const { logAction } = require('../utils/systemLogger');

const IMPORTERS = {
  OpenAlex: importOpenAlexByQuery,
  arXiv: importArxivByQuery,
  Crossref: importCrossrefByQuery,
  'IEEE Xplore': importIEEEByQuery,
};

let schedulerStarted = false;
let queueInterval = null;
let reportInterval = null;
let queueRunning = false;
let reportsRunning = false;

async function runCrawlerJob(jobOrId) {
  const startedAt = new Date();
  const job = typeof jobOrId === 'string'
    ? await CrawlerJob.findById(jobOrId)
    : jobOrId;

  if (!job) throw new Error('Crawler job not found');
  if (job.status === 'running') return job;
  if (!IMPORTERS[job.source_name]) {
    throw new Error(`Unsupported sync source: ${job.source_name}`);
  }
  if (!job.query) {
    throw new Error('Job query is required before running sync');
  }

  job.status = 'running';
  job.progress = 10;
  job.started_at = startedAt;
  job.completed_at = undefined;
  job.error_message = null;
  await job.save();

  try {
    const result = await IMPORTERS[job.source_name](job.query, job.max_records);
    const completedAt = new Date();

    job.status = 'success';
    job.progress = 100;
    job.records_processed = result.imported || 0;
    job.completed_at = completedAt;
    job.duration_seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
    job.result = {
      imported: result.imported || 0,
      skipped: result.skipped || 0,
      source_total: result.sourceTotal || result.source_total || 0,
    };
    await job.save();

    await Promise.all([
      logAction('BatchJob', job.requested_by || job.owner || null, job.source_name, {
        job_id: job._id,
        job_name: job.name,
        status: job.status,
        imported: job.result.imported,
        skipped: job.result.skipped,
      }),
      notifyJobComplete(job.requested_by || job.owner, job),
      DataSource.findOneAndUpdate(
        { name: job.source_name },
        {
          $set: {
            last_sync_at: completedAt,
            last_sync_status: 'success',
            last_error: '',
          },
          $inc: { papers_synced_count: job.result.imported },
        },
      ),
    ]);

    generateAllReports().catch((err) => {
      console.warn('⚠️  Report refresh after crawler job failed:', err.message);
    });

    return job;
  } catch (err) {
    const completedAt = new Date();
    job.status = 'failed';
    job.progress = 100;
    job.completed_at = completedAt;
    job.duration_seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
    job.error_message = err.message;
    await job.save();

    await Promise.all([
      logAction('BatchJob', job.requested_by || job.owner || null, job.source_name, {
        job_id: job._id,
        job_name: job.name,
        status: job.status,
        error: err.message,
      }),
      notifyJobComplete(job.requested_by || job.owner, job),
      DataSource.findOneAndUpdate(
        { name: job.source_name },
        {
          $set: {
            last_sync_at: completedAt,
            last_sync_status: 'failed',
            last_error: err.message,
          },
        },
      ),
    ]);

    throw err;
  }
}

async function runQueuedCrawlerJobs(limit = 2) {
  if (queueRunning) return { skipped: true, reason: 'queue already running' };
  queueRunning = true;

  try {
    const jobs = await CrawlerJob.find({
      status: 'queued',
      source_name: { $in: Object.keys(IMPORTERS) },
      query: { $exists: true, $ne: '' },
    })
      .sort({ created_at: 1 })
      .limit(limit);

    const results = [];
    for (const job of jobs) {
      try {
        const finished = await runCrawlerJob(job);
        results.push({ id: finished._id, status: finished.status });
      } catch (err) {
        results.push({ id: job._id, status: 'failed', error: err.message });
      }
    }

    return { processed: results.length, results };
  } finally {
    queueRunning = false;
  }
}

async function refreshScheduledReports() {
  if (reportsRunning) return { skipped: true, reason: 'reports already running' };
  reportsRunning = true;

  try {
    return await generateAllReports();
  } finally {
    reportsRunning = false;
  }
}

function startScheduler(options = {}) {
  if (schedulerStarted) return { started: false, reason: 'already started' };

  const queueMs = options.queueMs || 1000 * 60 * 15;
  const reportMs = options.reportMs || 1000 * 60 * 30;
  schedulerStarted = true;

  queueInterval = setInterval(() => {
    runQueuedCrawlerJobs().catch((err) => {
      console.warn('⚠️  Scheduled crawler queue failed:', err.message);
    });
  }, queueMs);
  reportInterval = setInterval(() => {
    refreshScheduledReports().catch((err) => {
      console.warn('⚠️  Scheduled report refresh failed:', err.message);
    });
  }, reportMs);

  if (queueInterval.unref) queueInterval.unref();
  if (reportInterval.unref) reportInterval.unref();

  setTimeout(() => {
    refreshScheduledReports().catch((err) => {
      console.warn('⚠️  Initial report refresh failed:', err.message);
    });
  }, options.initialReportDelayMs || 1000 * 10).unref?.();

  return { started: true, queueMs, reportMs };
}

function stopScheduler() {
  if (queueInterval) clearInterval(queueInterval);
  if (reportInterval) clearInterval(reportInterval);
  queueInterval = null;
  reportInterval = null;
  schedulerStarted = false;
}

module.exports = {
  runCrawlerJob,
  runQueuedCrawlerJobs,
  refreshScheduledReports,
  startScheduler,
  stopScheduler,
};
