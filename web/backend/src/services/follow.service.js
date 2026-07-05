const User = require('../models/User');
const Notification = require('../models/Notification');
const Paper = require('../models/Paper');

/**
 * Get followed subjects for a user (BR-029).
 */
async function getSubjects(userId) {
  const user = await User.findById(userId).select('followed_subjects').lean();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  // Enrich with newPapers count (simplified — in production, query papers collection)
  return user.followed_subjects.map((s) => ({
    ...s,
    newPapers: s.newPapers || 0,
    papers7d: s.papers7d || 0,
  }));
}

/**
 * Add a followed subject.
 */
async function addSubject(userId, { type, value, rule }) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        followed_subjects: {
          type,
          value,
          active: true,
          rule: rule || {},
        },
      },
    },
    { new: true },
  ).select('followed_subjects');

  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user.followed_subjects[user.followed_subjects.length - 1];
}

/**
 * Update a followed subject (rule, active state).
 */
async function updateSubject(userId, followId, updates) {
  const setFields = {};
  if (updates.active !== undefined) setFields['followed_subjects.$.active'] = updates.active;
  if (updates.rule) {
    for (const [k, v] of Object.entries(updates.rule)) {
      setFields[`followed_subjects.$.rule.${k}`] = v;
    }
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, 'followed_subjects.follow_id': followId },
    { $set: setFields },
    { new: true },
  ).select('followed_subjects');

  if (!user) throw Object.assign(new Error('Subject not found'), { statusCode: 404 });
  return user.followed_subjects.find((s) => s.follow_id === followId);
}

/**
 * Remove a followed subject.
 */
async function removeSubject(userId, followId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { followed_subjects: { follow_id: followId } } },
    { new: true },
  );
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
}

/**
 * Get follow alerts (notifications of type 'paper' linked to follow subjects).
 */
async function getAlerts(userId, query) {
  const filter = { user_id: userId, notification_type: 'paper' };
  if (query.priority) filter.priority = query.priority;
  if (query.unread === 'true') filter.is_read = false;

  const alerts = await Notification.find(filter)
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  // Enrich with paper data
  const paperIds = alerts.flatMap((a) => a.related_paper_ids || []);
  const papers = await Paper.find({ _id: { $in: paperIds } }).lean();
  const paperMap = new Map(papers.map((p) => [p._id.toString(), p]));

  return alerts.map((a) => ({
    ...a,
    papers: (a.related_paper_ids || []).map((id) => paperMap.get(id.toString())).filter(Boolean),
  }));
}

/**
 * Mark alert as read.
 */
async function markAlertRead(userId, alertId) {
  await Notification.updateOne(
    { _id: alertId, user_id: userId },
    { is_read: true },
  );
}

/**
 * Mark all alerts as read.
 */
async function markAllAlertsRead(userId) {
  await Notification.updateMany(
    { user_id: userId, notification_type: 'paper', is_read: false },
    { is_read: true },
  );
}

module.exports = {
  getSubjects,
  addSubject,
  updateSubject,
  removeSubject,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
};
