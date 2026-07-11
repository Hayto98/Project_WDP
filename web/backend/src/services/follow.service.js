const User = require('../models/User');
const Notification = require('../models/Notification');
const Paper = require('../models/Paper');
const { sendFollowPaperEmail } = require('./email.service');

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

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function paperMatchesSubject(paper, subject) {
  const needle = normalize(subject.value);
  if (!needle) return false;

  if (subject.type === 'Author') {
    return (paper.authors || []).some((author) => normalize(author.name).includes(needle));
  }

  if (subject.type === 'Field') {
    return (paper.research_fields || []).some((field) => {
      const normalizedField = normalize(field);
      return normalizedField.includes(needle) || needle.includes(normalizedField);
    });
  }

  const haystack = [
    paper.title,
    paper.abstract,
    ...(paper.keywords || []),
    ...(paper.research_fields || []),
  ].map(normalize).join(' ');
  return haystack.includes(needle);
}

async function notifyFollowersForPaper(paper) {
  if (!paper?._id) return { notified: 0, emailed: 0 };

  const users = await User.find({
    status: 'Active',
    followed_subjects: {
      $elemMatch: {
        active: true,
      },
    },
  }).select('email full_name followed_subjects').lean();

  let notified = 0;
  let emailed = 0;
  for (const user of users) {
    const matches = (user.followed_subjects || [])
      .filter((subject) => subject.active)
      .filter((subject) => paperMatchesSubject(paper, subject));

    for (const subject of matches) {
      const exists = await Notification.exists({
        user_id: user._id,
        notification_type: 'paper',
        follow_id: subject.follow_id,
        related_paper_ids: paper._id,
      });
      if (exists) continue;

      if (subject.rule?.in_app !== false) {
        await Notification.create({
          user_id: user._id,
          notification_type: 'paper',
          title: `Paper mới khớp "${subject.value}"`,
          content: paper.title,
          source: paper.source_name || paper.sources?.[0]?.source_name || 'Research Corpus',
          actor: 'Crawler',
          priority: Number(paper.citation_count || 0) >= 100 ? 'high' : 'normal',
          target_label: 'Xem paper',
          target_href: '#search',
          meta: [
            subject.type,
            paper.publication_year ? String(paper.publication_year) : '',
            paper.source_name || '',
          ].filter(Boolean),
          follow_id: subject.follow_id,
          related_paper_ids: [paper._id],
        });
        notified += 1;
      }

      if (subject.rule?.email && subject.rule?.frequency === 'instant') {
        const result = await sendFollowPaperEmail(user, subject, paper).catch((err) => ({
          sent: false,
          reason: err.message,
        }));
        if (result.sent) emailed += 1;
      }
    }
  }

  return { notified, emailed };
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
    { returnDocument: 'after' },
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
    { returnDocument: 'after' },
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
    { returnDocument: 'after' },
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
  notifyFollowersForPaper,
  paperMatchesSubject,
};
