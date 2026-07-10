const CollaborationInvite = require('../models/CollaborationInvite');
const User = require('../models/User');
const { notifyInviteReceived } = require('./notification.service');

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';
}

function subjectKey(subject) {
  const type = String(subject?.type || '').toLowerCase();
  const value = String(subject?.value || '').trim().toLowerCase();
  return value ? `${type}:${value}` : '';
}

function computeMatchScore(mySubjects, researcherSubjects) {
  const mine = new Set((mySubjects || []).filter((s) => s.active !== false).map(subjectKey).filter(Boolean));
  const theirs = new Set((researcherSubjects || []).filter((s) => s.active !== false).map(subjectKey).filter(Boolean));
  if (!mine.size || !theirs.size) return 50;

  const overlap = Array.from(mine).filter((key) => theirs.has(key)).length;
  const union = new Set([...mine, ...theirs]).size || 1;
  const jaccard = overlap / union;
  const coverage = overlap / mine.size;

  return Math.round(Math.min(99, 45 + jaccard * 35 + coverage * 20));
}

async function listResearchers(userId, query = {}) {
  const filter = { status: 'Active', _id: { $ne: userId } };
  if (query.q) {
    filter.$or = [
      { full_name: { $regex: query.q, $options: 'i' } },
      { email: { $regex: query.q, $options: 'i' } },
    ];
  }

  const [currentUser, researchers] = await Promise.all([
    User.findById(userId).select('followed_subjects').lean(),
    User.find(filter)
      .select('full_name email followed_subjects')
      .limit(20)
      .lean(),
  ]);

  return researchers.map((researcher) => ({
    id: researcher._id,
    name: researcher.full_name,
    initials: initials(researcher.full_name),
    email: researcher.email,
    match: computeMatchScore(currentUser?.followed_subjects || [], researcher.followed_subjects || []),
  })).sort((a, b) => b.match - a.match || a.name.localeCompare(b.name));
}

function buildInviteFilter(userId, query = {}) {
  const filter = {};
  if (query.direction) filter.direction = query.direction;
  if (query.status) filter.status = query.status;
  filter.$or = [
    { sender_id: userId },
    { invitee_user_id: userId },
  ];
  return filter;
}

async function listInvites(userId, query = {}) {
  return CollaborationInvite.find(buildInviteFilter(userId, query))
    .sort({ sent_at: -1 })
    .lean();
}

async function createInvite(userId, payload) {
  const invite = await CollaborationInvite.create({
    workspace_id: payload.workspace_id,
    invitee_email: payload.invitee_email,
    invitee_name: payload.invitee_name,
    invitee_user_id: payload.invitee_user_id || null,
    direction: payload.direction || 'outgoing',
    topic: payload.topic,
    message: payload.message,
    sender_id: userId,
  });

  if (invite.invitee_user_id) {
    notifyInviteReceived(invite.invitee_user_id, invite);
  }

  return invite;
}

async function respondToInvite(userId, inviteId, status) {
  return CollaborationInvite.findOneAndUpdate(
    { _id: inviteId, $or: [{ sender_id: userId }, { invitee_user_id: userId }] },
    { status, responded_at: new Date() },
    { new: true },
  );
}

module.exports = {
  listResearchers,
  listInvites,
  createInvite,
  respondToInvite,
};
