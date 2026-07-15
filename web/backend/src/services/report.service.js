const Paper = require('../models/Paper');
const AnalysisReport = require('../models/AnalysisReport');
const { slugify } = require('../utils/slugify');

const TOKEN_POOL = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'];
const GAP_ASPECTS = ['Lý thuyết', 'Hiệu năng', 'An toàn & Riêng tư', 'Y sinh', 'Bền vững'];
const GAP_DENSITY_THRESHOLD = 0.35;
const GAP_INTEREST_THRESHOLD = 0.55;
const ASPECT_KEYWORDS = {
  'Lý thuyết': ['theory', 'theoretical', 'convergence', 'representation', 'bound', 'lý thuyết'],
  'Hiệu năng': ['efficiency', 'performance', 'optimization', 'latency', 'inference', 'cost', 'hiệu năng'],
  'An toàn & Riêng tư': ['privacy', 'security', 'adversarial', 'robustness', 'federated', 'safe', 'riêng tư', 'an toàn'],
  'Y sinh': ['biomedical', 'clinical', 'medical', 'healthcare', 'diagnosis', 'biology', 'y sinh'],
  'Bền vững': ['sustainable', 'carbon', 'energy', 'green', 'efficient', 'tinyml', 'bền vững'],
};

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getPrimaryField(paper) {
  return paper.research_fields?.[0] || paper.keywords?.[0] || 'Other';
}

function getKeywordBucket(paper) {
  const keyword = paper.keywords?.[0] || paper.research_fields?.[0] || 'other';
  return {
    id: slugify(keyword),
    label: keyword,
    topic: slugify(getPrimaryField(paper)),
  };
}

async function saveReport(reportType, resultSnapshot, criteria = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  return AnalysisReport.findOneAndUpdate(
    { report_type: reportType },
    {
      $set: {
        criteria,
        result_snapshot: resultSnapshot,
        generated_at: now,
        expires_at: expiresAt,
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();
}

async function getTopFields(limit = 6) {
  const rows = await Paper.aggregate([
    { $match: { status: { $ne: 'Archived' } } },
    {
      $project: {
        field: {
          $ifNull: [{ $arrayElemAt: ['$research_fields', 0] }, 'Other'],
        },
      },
    },
    { $group: { _id: '$field', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]);

  return rows.map((row, index) => ({
    key: slugify(row._id),
    label: row._id,
    token: TOKEN_POOL[index % TOKEN_POOL.length],
    count: row.count,
  }));
}

async function generateTrendSummary() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 6;
  const topFields = await getTopFields();

  const series = topFields.map(({ key, label, token }) => ({ key, label, token }));
  const fieldByLabel = new Map(topFields.map((field) => [field.label, field.key]));
  const rows = await Paper.aggregate([
    {
      $match: {
        status: { $ne: 'Archived' },
        publication_year: { $gte: startYear, $lte: currentYear },
      },
    },
    {
      $project: {
        year: '$publication_year',
        field: {
          $ifNull: [{ $arrayElemAt: ['$research_fields', 0] }, 'Other'],
        },
      },
    },
    { $match: { field: { $in: topFields.map((field) => field.label) } } },
    { $group: { _id: { year: '$year', field: '$field' }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1 } },
  ]);

  const points = [];
  for (let year = startYear; year <= currentYear; year += 1) {
    const point = { period: String(year) };
    for (const field of series) point[field.key] = 0;
    points.push(point);
  }

  const pointByYear = new Map(points.map((point) => [Number(point.period), point]));
  for (const row of rows) {
    const key = fieldByLabel.get(row._id.field);
    if (key && pointByYear.has(row._id.year)) {
      pointByYear.get(row._id.year)[key] = row.count;
    }
  }

  const snapshot = {
    series,
    points,
    updatedAt: new Date().toISOString(),
  };
  return saveReport('TrendSummary', snapshot, { startYear, endYear: currentYear, topFields: series.length });
}

async function generateGrowthTable(trendReport = null) {
  const sourceTrendReport = trendReport || await generateTrendSummary();
  const { series = [], points = [] } = sourceTrendReport.result_snapshot || {};
  const years = Math.max(1, points.length - 1);

  const rows = series.map((field) => {
    const values = points.map((point) => Number(point[field.key]) || 0);
    const first = Math.max(1, values[0] || 0);
    const latest = values[values.length - 1] || 0;
    const cagr = Math.pow(Math.max(1, latest) / first, 1 / years) - 1;
    const status = cagr >= 0.18 ? 'emerging' : cagr <= -0.03 ? 'declining' : 'stable';
    return {
      key: field.key,
      label: field.label,
      token: field.token,
      latest,
      cagr,
      trend: values,
      status,
    };
  }).sort((a, b) => b.cagr - a.cagr);

  return saveReport('GrowthTable', rows, { source: 'TrendSummary' });
}

async function generateCooccurrence() {
  const papers = await Paper.find({ status: { $ne: 'Archived' } })
    .select('keywords research_fields')
    .sort({ citation_count: -1, publication_year: -1 })
    .limit(500)
    .lean();

  const nodeCounts = new Map();
  const edgeCounts = new Map();
  const nodeTopics = new Map();

  for (const paper of papers) {
    const tokens = [...(paper.keywords || []), ...(paper.research_fields || [])]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8);
    const unique = Array.from(new Set(tokens.map((item) => slugify(item)))).slice(0, 8);
    const labelById = new Map(tokens.map((item) => [slugify(item), item]));

    for (const id of unique) {
      nodeCounts.set(id, (nodeCounts.get(id) || 0) + 1);
      nodeTopics.set(id, slugify(getPrimaryField(paper)));
    }

    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const pair = [unique[i], unique[j]].sort();
        const key = pair.join('__');
        edgeCounts.set(key, {
          count: (edgeCounts.get(key)?.count || 0) + 1,
          a: pair[0],
          b: pair[1],
        });
      }
    }

    for (const [id, label] of labelById) {
      if (!nodeTopics.has(`${id}:label`)) nodeTopics.set(`${id}:label`, label);
    }
  }

  const maxCount = Math.max(1, ...nodeCounts.values());
  const nodes = Array.from(nodeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([id, count]) => ({
      id,
      label: nodeTopics.get(`${id}:label`) || id.replace(/_/g, ' '),
      topic: nodeTopics.get(id) || 'other',
      freq: Math.max(8, Math.round((count / maxCount) * 100)),
    }));

  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = Array.from(edgeCounts.values())
    .filter((edge) => visibleIds.has(edge.a) && visibleIds.has(edge.b))
    .sort((a, b) => b.count - a.count)
    .slice(0, 48)
    .map((edge) => ({
      a: edge.a,
      b: edge.b,
      weight: Math.min(5, Math.max(1, edge.count)),
    }));

  return saveReport('Cooccurrence', { nodes, edges }, { sampleSize: papers.length });
}

function aspectMatchScore(paper, keywords) {
  const haystack = normalizeText([
    paper.title,
    paper.abstract,
    ...(paper.keywords || []),
    ...(paper.research_fields || []),
  ].join(' '));
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase())) ? 1 : 0;
}

function toEvidencePapers(papers, limit = 3) {
  return papers
    .slice()
    .sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0))
    .slice(0, limit)
    .map((paper) => ({
      id: String(paper._id),
      title: paper.title || 'Untitled paper',
      year: paper.publication_year || null,
      citations: paper.citation_count || 0,
    }));
}

async function generateResearchGap() {
  const fields = (await getTopFields()).map(({ key, label, token }) => ({ key, label, token }));
  const papers = await Paper.find({ status: { $ne: 'Archived' } })
    .select('title abstract keywords research_fields publication_year citation_count')
    .lean();

  const currentYear = new Date().getFullYear();
  const papersByField = new Map(fields.map((field) => [field.key, []]));
  for (const paper of papers) {
    const key = slugify(getPrimaryField(paper));
    if (papersByField.has(key)) papersByField.get(key).push(paper);
  }

  const maxPapers = Math.max(1, ...Array.from(papersByField.values()).map((items) => items.length));
  const gaps = [];

  fields.forEach((field, fi) => {
    const fieldPapers = papersByField.get(field.key) || [];
    GAP_ASPECTS.forEach((aspect, ai) => {
      const aspectPapers = fieldPapers.filter((paper) => aspectMatchScore(paper, ASPECT_KEYWORDS[aspect]));
      const density = Math.min(1, aspectPapers.length / Math.max(1, Math.min(maxPapers, fieldPapers.length || 1)));
      const recentCount = aspectPapers.filter((paper) => paper.publication_year >= currentYear - 2).length;
      const recentRatio = aspectPapers.length ? recentCount / aspectPapers.length : 0;
      const avgCitations = aspectPapers.reduce((sum, paper) => sum + (paper.citation_count || 0), 0) / Math.max(1, aspectPapers.length);
      const interest = Math.min(1, 0.35 + recentRatio * 0.35 + Math.min(avgCitations / 80, 0.3));
      const score = interest * (1 - density);
      const trend = [];
      for (let offset = 5; offset >= 0; offset -= 1) {
        const year = currentYear - offset;
        trend.push(aspectPapers.filter((paper) => paper.publication_year === year).length);
      }

      gaps.push({
        id: `${field.key}-${ai}`,
        fieldKey: field.key,
        fieldLabel: field.label,
        token: field.token,
        field: field.label,
        aspect,
        fi,
        ai,
        density: Number(density.toFixed(3)),
        interest: Number(interest.toFixed(3)),
        papers: aspectPapers.length,
        score: Number(score.toFixed(3)),
        keywords: [field.label, ...ASPECT_KEYWORDS[aspect].slice(0, 2)],
        direction: score >= 0.35
          ? `Mảng "${aspect}" của ${field.label} còn ít công bố so với mức quan tâm gần đây.`
          : `"${aspect}" trong ${field.label} hiện chưa nổi bật như một khoảng trống lớn.`,
        trend,
        evidence: toEvidencePapers(aspectPapers),
        gap: density <= GAP_DENSITY_THRESHOLD && interest >= GAP_INTEREST_THRESHOLD,
      });
    });
  });

  const snapshot = {
    fields,
    aspects: GAP_ASPECTS,
    gaps,
    gapCount: gaps.filter((gap) => gap.gap).length,
    thresholds: {
      density: GAP_DENSITY_THRESHOLD,
      interest: GAP_INTEREST_THRESHOLD,
    },
    ai: {
      summary: gaps.length
        ? 'Các khoảng trống được sinh từ mật độ công bố, tín hiệu gần đây và trích dẫn trong corpus hiện tại.'
        : 'Chưa đủ dữ liệu để xác định khoảng trống nghiên cứu.',
      directions: gaps
        .filter((gap) => gap.gap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((gap) => ({ topic: `${gap.fieldLabel} / ${gap.aspect}`, rationale: gap.direction })),
      evidence: fields.map((field) => ({
        label: field.label,
        papers: (papersByField.get(field.key) || []).length,
      })),
    },
  };

  return saveReport('ResearchGap', snapshot, {
    aspects: GAP_ASPECTS.length,
    fields: fields.length,
    densityThreshold: GAP_DENSITY_THRESHOLD,
    interestThreshold: GAP_INTEREST_THRESHOLD,
  });
}

async function generateAllReports() {
  const trend = await generateTrendSummary();
  const [growth, cooccurrence, researchGap] = await Promise.all([
    generateGrowthTable(trend),
    generateCooccurrence(),
    generateResearchGap(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    reports: [trend, growth, cooccurrence, researchGap].map((report) => ({
      id: report._id,
      type: report.report_type,
      generated_at: report.generated_at,
    })),
  };
}

module.exports = {
  generateAllReports,
  generateTrendSummary,
  generateGrowthTable,
  generateCooccurrence,
  generateResearchGap,
  GAP_DENSITY_THRESHOLD,
  GAP_INTEREST_THRESHOLD,
};
