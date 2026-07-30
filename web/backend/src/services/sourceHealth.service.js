const DataSource = require('../models/DataSource');
const {
  SOURCE_ENDPOINTS,
  probeSource,
  getEffectiveAuth,
} = require('./sourceCredentials.service');

const SUPPORTED_SOURCES = ['OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'ACM Digital Library', 'Exa'];

async function timedCheck(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return {
      name,
      ok: true,
      latencyMs: Date.now() - started,
      message: detail || 'OK',
    };
  } catch (err) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - started,
      message: err.message || 'API check failed',
    };
  }
}

async function checkSourceApis() {
  const checks = await Promise.all(
    SUPPORTED_SOURCES.map((name) => timedCheck(name, () => probeSource(name))),
  );

  await Promise.all(checks.map(async (check) => {
    const existing = await DataSource.findOne({ name: check.name }).select('enabled').lean();
    await DataSource.updateOne(
      { name: check.name },
      {
        $setOnInsert: {
          name: check.name,
          api_endpoint: SOURCE_ENDPOINTS[check.name],
          enabled: true,
        },
        $set: {
          // Keep existing enabled flag; do not force-enable paused sources.
          ...(existing ? {} : { enabled: true }),
          last_sync_status: check.ok ? 'Success' : 'Failed',
          last_error: check.ok ? null : check.message,
          latency: `${(check.latencyMs / 1000).toFixed(1)}s`,
          error_rate: check.ok ? '0%' : '100%',
          last_sync_at: new Date(),
          'credentials.last_tested_at': new Date(),
          'credentials.last_test_ok': check.ok,
          'credentials.last_test_message': check.message,
        },
      },
      { upsert: true },
    );
  }));

  return checks;
}

module.exports = {
  checkSourceApis,
  SUPPORTED_SOURCES,
  getEffectiveAuth,
};
