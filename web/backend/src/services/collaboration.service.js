const CollaborationInvite = require('../models/CollaborationInvite');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { notifyInviteReceived } = require('./notification.service');
const { sendInviteEmail } = require('./email.service');

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

async function listInvites(userId, query = {}) {
  const user = await User.findById(userId).select('email').lean();
  
  const filter = {};
  if (query.direction) filter.direction = query.direction;
  if (query.status) filter.status = query.status;
  
  const orConditions = [
    { sender_id: userId },
    { invitee_user_id: userId },
  ];
  
  if (user && user.email) {
    orConditions.push({ invitee_email: user.email.toLowerCase() });
  }
  
  filter.$or = orConditions;

  const invites = await CollaborationInvite.find(filter)
    .sort({ sent_at: -1 })
    .lean();
    
  return invites.map(invite => ({
    ...invite,
    direction: invite.sender_id.toString() === userId.toString() ? 'outgoing' : 'incoming'
  }));
}

async function createInvite(userId, payload) {
  const workspace = await Workspace.findOne({
    _id: payload.workspace_id,
    members: {
      $elemMatch: {
        user_id: userId,
        role: { $in: ['owner', 'editor'] },
      },
    },
  }).select('_id name').lean();
  if (!workspace) {
    throw Object.assign(new Error('Only workspace owner or editor can invite collaborators'), {
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  }

  // Check for existing pending invite
  const existingInvite = await CollaborationInvite.findOne({
    workspace_id: payload.workspace_id,
    invitee_email: payload.invitee_email.toLowerCase(),
    status: 'pending'
  }).lean();

  if (existingInvite) {
    throw Object.assign(new Error('Người này đã có một lời mời đang chờ xác nhận trong workspace này.'), {
      statusCode: 400,
      code: 'DUPLICATE_INVITE',
    });
  }

  const sender = await User.findById(userId).select('full_name').lean();

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

  sendInviteEmail({
    to: invite.invitee_email,
    inviteeName: invite.invitee_name || invite.invitee_email,
    workspaceName: workspace.name || 'Workspace',
    senderName: sender?.full_name || 'Một thành viên',
    topic: invite.topic,
    message: invite.message,
  }).catch((err) => {
    console.error('Failed to send invite email:', err);
  });

  return invite;
}

async function respondToInvite(userId, inviteId, status) {
  const user = await User.findById(userId).select('full_name email').lean();
  if (!user) throw new Error('User not found');

  const filter = { _id: inviteId };
  filter.$or = [
    { invitee_user_id: userId },
    { invitee_email: user.email.toLowerCase() }
  ];

  const invite = await CollaborationInvite.findOneAndUpdate(
    filter,
    { status, responded_at: new Date(), invitee_user_id: userId },
    { new: true }
  ).lean();

  if (invite && status === 'accepted') {
    const user = await User.findById(userId).select('full_name email').lean();
    if (user) {
      const name = invite.invitee_name || user.full_name || user.email.split('@')[0];
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "NC";

      await Workspace.updateOne(
        { _id: invite.workspace_id, 'members.user_id': { $ne: userId } },
        {
          $push: {
            members: {
              user_id: userId,
              name: name,
              initials: initials,
              role: 'editor',
              joined_at: new Date()
            }
          }
        }
      );
    }
  }

  return invite;
}

async function deleteInvite(userId, inviteId) {
  const invite = await CollaborationInvite.findOne({ _id: inviteId, sender_id: userId });
  if (!invite) throw new Error('Invite not found or you are not the sender');
  
  await CollaborationInvite.findByIdAndDelete(inviteId);
  return { success: true };
}

module.exports = {
  listResearchers,
  listInvites,
  createInvite,
  respondToInvite,
  deleteInvite,
};
