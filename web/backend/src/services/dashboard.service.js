const Paper = require('../models/Paper');
const PaperView = require('../models/PaperView');
const AnalysisReport = require('../models/AnalysisReport');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getTrendingPapers } = require('./paper.service');

/**
 * Build dashboard overview data (maps to sample.ts makeDashboardData).
 */
async function getDashboardOverview(userId) {
  // KPIs
  const totalPapers = await Paper.countDocuments({ status: { $ne: 'Archived' } });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newPapers30d = await Paper.countDocuments({
    created_at: { $gte: thirtyDaysAgo },
    status: { $ne: 'Archived' },
  });

  // Trending papers
  const trending = await getTrendingPapers(30, 7);

  // Research Gap report (from cached report)
  const gapReport = await AnalysisReport.findOne({ report_type: 'ResearchGap' })
    .sort({ generated_at: -1 })
    .lean();

  // Trend report
  const trendReport = await AnalysisReport.findOne({ report_type: 'TrendSummary' })
    .sort({ generated_at: -1 })
    .lean();

  // User's followed subjects
  const user = await User.findById(userId).select('followed_subjects').lean();
  const followed = user?.followed_subjects || [];

  // Recent notifications
  const notifications = await Notification.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(5)
    .lean();

  // Growth calculation (simplified)
  const growthReport = await AnalysisReport.findOne({ report_type: 'GrowthTable' })
    .sort({ generated_at: -1 })
    .lean();

  const kpis = [
    {
      id: 'corpus',
      label: 'Bài báo trong corpus',
      value: totalPapers,
      delta: newPapers30d,
      deltaKind: 'up',
      hint: `+${newPapers30d.toLocaleString()} trong 30 ngày qua`,
      format: 'int',
    },
    {
      id: 'new',
      label: 'Bài mới (30 ngày)',
      value: newPapers30d,
      deltaKind: 'up',
      hint: 'so với kỳ trước',
      format: 'int',
    },
    {
      id: 'gaps',
      label: 'Khoảng trống tiềm năng',
      value: gapReport?.result_snapshot?.gapCount || 0,
      deltaKind: 'neutral',
      hint: 'mật độ thấp · tiềm năng cao',
      format: 'int',
    },
  ];

  return {
    updatedAt: new Date().toISOString(),
    kpis,
    trendSeries: trendReport?.result_snapshot?.series || [],
    trend: trendReport?.result_snapshot?.points || [],
    gapFields: gapReport?.result_snapshot?.fields || [],
    gapAspects: gapReport?.result_snapshot?.aspects || [],
    gaps: gapReport?.result_snapshot?.gaps || [],
    trending,
    ai: gapReport?.result_snapshot?.ai || { summary: '', directions: [], evidence: [] },
    followed: followed.map((f) => ({
      id: f.follow_id,
      label: f.value,
      type: f.type.toLowerCase(),
      newPapers: f.newPapers || 0,
    })),
    notifications: notifications.map((n) => ({
      id: n._id,
      subject: n.source,
      paperTitle: n.title,
      when: n.created_at,
      unread: !n.is_read,
    })),
  };
}

module.exports = { getDashboardOverview };
