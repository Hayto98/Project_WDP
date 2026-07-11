const User = require('../models/User');
const Notification = require('../models/Notification');
const Paper = require('../models/Paper');
const { sendFollowDigestEmail } = require('./email.service');

const WINDOW_HOURS = {
  daily: 24,
  weekly: 24 * 7,
};

function sinceForFrequency(frequency, now = new Date()) {
  const hours = WINDOW_HOURS[frequency];
  if (!hours) throw new Error(`Unsupported digest frequency: ${frequency}`);
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function digestSubjects(user, frequency) {
  return (user.followed_subjects || [])
    .filter((subject) => subject.active)
    .filter((subject) => subject.rule?.email)
    .filter((subject) => subject.rule?.frequency === frequency);
}

async function buildDigestItems(user, frequency, now = new Date()) {
  const subjects = digestSubjects(user, frequency);
  if (!subjects.length) return [];

  const since = sinceForFrequency(frequency, now);
  const followIds = subjects.map((subject) => subject.follow_id);
  const notifications = await Notification.find({
    user_id: user._id,
    notification_type: 'paper',
    follow_id: { $in: followIds },
    created_at: { $gte: since },
  }).sort({ created_at: -1 }).lean();

  if (!notifications.length) return [];

  const paperIds = notifications.flatMap((item) => item.related_paper_ids || []);
  const papers = await Paper.find({ _id: { $in: paperIds } }).lean();
  const paperMap = new Map(papers.map((paper) => [paper._id.toString(), paper]));
  const subjectMap = new Map(subjects.map((subject) => [subject.follow_id, subject]));

  return notifications.map((notification) => ({
    id: notification._id,
    title: notification.title,
    source: notification.source,
    subject: subjectMap.get(notification.follow_id),
    paper: paperMap.get(notification.related_paper_ids?.[0]?.toString()) || null,
    created_at: notification.created_at,
  }));
}

async function sendFollowDigests(frequency = 'daily', now = new Date()) {
  if (!WINDOW_HOURS[frequency]) throw new Error(`Unsupported digest frequency: ${frequency}`);

  const users = await User.find({
    status: 'Active',
    followed_subjects: {
      $elemMatch: {
        active: true,
        'rule.email': true,
        'rule.frequency': frequency,
      },
    },
  }).select('email full_name followed_subjects').lean();

  const results = [];
  for (const user of users) {
    const items = await buildDigestItems(user, frequency, now);
    if (!items.length) {
      results.push({ userId: user._id, sent: false, skipped: true, reason: 'NO_DIGEST_ITEMS' });
      continue;
    }
    const result = await sendFollowDigestEmail(user, frequency, items).catch((err) => ({
      sent: false,
      reason: err.message,
    }));
    results.push({ userId: user._id, itemCount: items.length, ...result });
  }

  return {
    frequency,
    users: users.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    results,
  };
}

module.exports = {
  sinceForFrequency,
  digestSubjects,
  buildDigestItems,
  sendFollowDigests,
};
