const Paper = require('../models/Paper');
const AnalysisReport = require('../models/AnalysisReport');

/**
 * Trend analysis — publication counts by year/quarter (BR-015, BR-016).
 */
async function getTrends(query) {
  const { range = '5y', granularity = 'year' } = query;

  // Determine year window
  const currentYear = new Date().getFullYear();
  let startYear;
  switch (range) {
    case '12m': startYear = currentYear - 1; break;
    case '24m': startYear = currentYear - 2; break;
    case '5y':
    default: startYear = currentYear - 6; break;
  }

  // Aggregate by year
  const pipeline = [
    {
      $match: {
        status: { $ne: 'Archived' },
        publication_year: { $gte: startYear },
      },
    },
    {
      $group: {
        _id: {
          year: '$publication_year',
          field: { $arrayElemAt: ['$research_fields', 0] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1 } },
  ];

  const raw = await Paper.aggregate(pipeline);

  // Reshape into TrendPoint[] format
  const yearMap = new Map();
  for (const r of raw) {
    const year = r._id.year;
    const field = r._id.field || 'Other';
    if (!yearMap.has(year)) yearMap.set(year, { period: String(year) });
    yearMap.get(year)[field] = r.count;
  }

  return Array.from(yearMap.values());
}

/**
 * Compute growth rates per field (BR-016).
 */
async function getGrowth(query) {
  const points = await getTrends(query);

  // Extract unique fields from points
  if (points.length < 2) return [];

  const fields = new Set();
  for (const p of points) {
    for (const key of Object.keys(p)) {
      if (key !== 'period') fields.add(key);
    }
  }

  const years = Math.max(1, points.length - 1);

  return Array.from(fields).map((field) => {
    const vals = points.map((p) => Number(p[field]) || 0);
    const first = Math.max(1, vals[0]);
    const last = vals[vals.length - 1];
    const cagr = Math.pow(last / first, 1 / years) - 1;
    const status = cagr >= 0.18 ? 'emerging' : cagr <= -0.03 ? 'declining' : 'stable';

    return {
      key: field.toLowerCase().replace(/\s+/g, '_'),
      label: field,
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

  if (!report) return { fields: [], aspects: [], gaps: [] };

  let gaps = report.result_snapshot.gaps || [];
  const densityThreshold = parseFloat(query.densityThreshold) || 0.4;

  // Mark gaps based on threshold
  gaps = gaps.map((g) => ({
    ...g,
    isGap: g.density <= densityThreshold && (g.interest || 0) >= 0.55,
  }));

  return {
    fields: report.result_snapshot.fields || [],
    aspects: report.result_snapshot.aspects || [],
    gaps,
  };
}

module.exports = { getTrends, getGrowth, getCooccurrence, getGaps };
