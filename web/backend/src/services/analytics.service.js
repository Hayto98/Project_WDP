const Paper = require('../models/Paper');
const AnalysisReport = require('../models/AnalysisReport');
const { slugify } = require('../utils/slugify');

function resolveStartYear(range) {
  const currentYear = new Date().getFullYear();
  switch (range) {
    case '12m': return currentYear - 1;
    case '24m': return currentYear - 2;
    case '5y':
    default: return currentYear - 6;
  }
}

function periodFromYearMonth(year, month, granularity) {
  if (granularity !== 'quarter') return String(year);
  const m = Number(month);
  const quarter = Number.isFinite(m) && m >= 1 && m <= 12
    ? Math.ceil(m / 3)
    : 1;
  return `${year}-Q${quarter}`;
}

/**
 * Trend analysis — publication counts by year/quarter (BR-015, BR-016).
 * Returns { points, series } with slug keys aligned to growth + co-occurrence.
 */
async function getTrends(query) {
  const { range = '5y', granularity = 'year' } = query;
  const startYear = resolveStartYear(range);
  const useQuarter = granularity === 'quarter';

  const pipeline = [
    {
      $match: {
        status: { $ne: 'Archived' },
        publication_year: { $gte: startYear },
      },
    },
    {
      $project: {
        year: '$publication_year',
        month: { $ifNull: ['$publication_month', 1] },
        field: {
          $ifNull: [{ $arrayElemAt: ['$research_fields', 0] }, 'Other'],
        },
      },
    },
    {
      $group: {
        _id: useQuarter
          ? {
            year: '$year',
            quarter: {
              $ceil: { $divide: ['$month', 3] },
            },
            field: '$field',
          }
          : {
            year: '$year',
            field: '$field',
          },
        count: { $sum: 1 },
      },
    },
    {
      $sort: useQuarter
        ? { '_id.year': 1, '_id.quarter': 1 }
        : { '_id.year': 1 },
    },
  ];

  const raw = await Paper.aggregate(pipeline);

  const seriesMap = new Map();
  const periodMap = new Map();

  for (const r of raw) {
    const label = r._id.field || 'Other';
    const key = slugify(label);
    if (!seriesMap.has(key)) {
      seriesMap.set(key, { key, label });
    }

    const period = useQuarter
      ? `${r._id.year}-Q${r._id.quarter || 1}`
      : String(r._id.year);

    if (!periodMap.has(period)) {
      periodMap.set(period, { period });
    }
    periodMap.get(period)[key] = (periodMap.get(period)[key] || 0) + r.count;
  }

  const series = Array.from(seriesMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const points = Array.from(periodMap.values()).map((point) => {
    const filled = { ...point };
    for (const s of series) {
      if (filled[s.key] === undefined) filled[s.key] = 0;
    }
    return filled;
  });

  return { points, series };
}

/**
 * Compute growth rates per field (BR-016).
 */
async function getGrowth(query) {
  const { points, series } = await getTrends(query);

  if (points.length < 2 || series.length === 0) return [];

  const periods = Math.max(1, points.length - 1);

  return series.map((field) => {
    const vals = points.map((p) => Number(p[field.key]) || 0);
    const first = Math.max(1, vals[0] || 0);
    const last = vals[vals.length - 1] || 0;
    const cagr = Math.pow(Math.max(1, last) / first, 1 / periods) - 1;
    const status = cagr >= 0.18 ? 'emerging' : cagr <= -0.03 ? 'declining' : 'stable';

    return {
      key: field.key,
      label: field.label,
      latest: last,
      cagr,
      trend: vals,
      status,
    };
  }).sort((a, b) => b.cagr - a.cagr);
}

/**
 * Get co-occurrence graph from cached report (BR-017).
 */
async function getCooccurrence() {
  const report = await AnalysisReport.findOne({ report_type: 'Cooccurrence' })
    .sort({ generated_at: -1 })
    .lean();

  return report?.result_snapshot || { nodes: [], edges: [] };
}

/**
 * Get Research Gap matrix (BR-018).
 */
async function getGaps(query) {
  const report = await AnalysisReport.findOne({ report_type: 'ResearchGap' })
    .sort({ generated_at: -1 })
    .lean();

  if (!report) {
    return {
      hasReport: false,
      generatedAt: null,
      gapCount: 0,
      fields: [],
      aspects: [],
      gaps: [],
      ai: { summary: '', directions: [], evidence: [] },
      thresholds: { density: 0.35, interest: 0.55 },
    };
  }

  const densityThreshold = parseFloat(query.densityThreshold);
  const threshold = Number.isFinite(densityThreshold) ? densityThreshold : 0.35;
  const interestThreshold = Number(report.result_snapshot?.thresholds?.interest ?? 0.55);

  const gaps = (report.result_snapshot.gaps || []).map((g) => {
    const isGap = g.density <= threshold && (g.interest || 0) >= interestThreshold;
    return {
      ...g,
      gap: isGap,
      isGap,
    };
  });

  return {
    hasReport: true,
    generatedAt: report.generated_at,
    gapCount: gaps.filter((gap) => gap.isGap).length,
    fields: report.result_snapshot.fields || [],
    aspects: report.result_snapshot.aspects || [],
    gaps,
    ai: report.result_snapshot.ai || { summary: '', directions: [], evidence: [] },
    thresholds: {
      density: threshold,
      interest: interestThreshold,
    },
  };
}

async function getLiveGaps(payload) {
  const liveGapService = require('./liveGap.service');
  return liveGapService.getLiveGaps(payload);
}

async function saveLiveGaps(result, user) {
  const liveGapService = require('./liveGap.service');
  return liveGapService.saveLiveGapReport(result, user?.id || null);
}

async function getLiveTrends(payload) {
  const liveTrendService = require('./liveTrend.service');
  return liveTrendService.getLiveTrends(payload);
}

async function saveLiveTrends(result, user) {
  const liveTrendService = require('./liveTrend.service');
  return liveTrendService.saveLiveTrendReport(result, user?.id || null);
}

async function getSavedLiveTrends(user) {
  const AnalysisReport = require('../models/AnalysisReport');
  const query = {
    report_type: 'CustomSearch',
    'criteria.mode': 'live_trend',
  };
  if (user?.id) {
    query['criteria.requested_by'] = user.id;
  }
  const reports = await AnalysisReport.find(query)
    .sort({ generated_at: -1 })
    .limit(50)
    .lean();
  
  return reports.map(r => ({
    id: r._id,
    topic: r.criteria.topic,
    sources: r.criteria.sources,
    yearFrom: r.criteria.yearFrom,
    yearTo: r.criteria.yearTo,
    generatedAt: r.generated_at,
    result: r.result_snapshot
  }));
}

module.exports = {
  getTrends,
  getGrowth,
  getCooccurrence,
  getGaps,
  getLiveGaps,
  saveLiveGaps,
  getLiveTrends,
  saveLiveTrends,
  getSavedLiveTrends,
  // exported for tests / reuse
  periodFromYearMonth,
  slugify,
};
