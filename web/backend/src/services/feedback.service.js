const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { parsePagination } = require('../utils/pagination');
const {
  notifyAdminsNewFeedback,
  notifyUserFeedbackReply,
} = require('./notification.service');

function ensureMessages(feedback) {
  if (Array.isArray(feedback.messages) && feedback.messages.length) {
    return feedback.messages;
  }

  const seeded = [];
  if (feedback.content) {
    seeded.push({
      sender_role: 'User',
      sender_id: feedback.user_id?._id || feedback.user_id || null,
      sender_name: feedback.user_id?.full_name || feedback.user_id?.email || 'Người dùng',
      content: feedback.content,
      created_at: feedback.created_at || new Date(),
    });
  }
  if (feedback.admin_note) {
    seeded.push({
      sender_role: 'Admin',
      sender_id: null,
      sender_name: 'Admin',
      content: feedback.admin_note,
      created_at: feedback.updated_at || feedback.created_at || new Date(),
    });
  }
  return seeded;
}

function serializeFeedback(feedback) {
  const plain = typeof feedback.toObject === 'function' ? feedback.toObject() : { ...feedback };
  const messages = ensureMessages(plain);
  const last = messages[messages.length - 1];
  return {
    ...plain,
    messages,
    last_message: last?.content || plain.content || '',
    last_message_at: plain.last_message_at || last?.created_at || plain.created_at,
    last_sender_role: plain.last_sender_role || last?.sender_role || 'User',
  };
}

async function createFeedback(userId, payload, actor = null) {
  const actorDoc = await User.findById(userId).select('full_name email').lean();
  const senderName = actorDoc?.full_name || actorDoc?.email || actor?.email || 'Người dùng';
  const now = new Date();
  const message = {
    sender_role: 'User',
    sender_id: userId,
    sender_name: senderName,
    content: payload.content,
    created_at: now,
  };

  // Continue the latest open conversation for this user when possible.
  const existing = await Feedback.findOne({
    user_id: userId,
    status: { $in: ['Pending', 'Reviewed'] },
  }).sort({ last_message_at: -1, created_at: -1 });

  let feedback;
  if (existing) {
    existing.messages = ensureMessages(existing);
    existing.messages.push(message);
    existing.content = existing.content || payload.content;
    existing.status = 'Pending';
    existing.last_message_at = now;
    existing.last_sender_role = 'User';
    await existing.save();
    feedback = existing;
  } else {
    feedback = await Feedback.create({
      user_id: userId,
      content: payload.content,
      status: 'Pending',
      messages: [message],
      last_message_at: now,
      last_sender_role: 'User',
    });
  }

  await notifyAdminsNewFeedback(feedback, senderName);
  return serializeFeedback(feedback);
}

async function listFeedback(user, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const isAdmin = user.roles.includes('Admin');
  const filter = isAdmin ? {} : { user_id: user.id };
  if (query.status) filter.status = query.status;

  const feedbackQuery = Feedback.find(filter)
    .sort({ last_message_at: -1, created_at: -1 })
    .skip(skip)
    .limit(limit);
  if (isAdmin) feedbackQuery.populate('user_id', 'full_name email roles status');

  const [feedbacks, total] = await Promise.all([
    feedbackQuery.lean(),
    Feedback.countDocuments(filter),
  ]);

  return {
    feedbacks: feedbacks.map(serializeFeedback),
    page,
    limit,
    total,
  };
}

async function countPendingFeedback() {
  return Feedback.countDocuments({ status: 'Pending' });
}

async function getFeedbackById(feedbackId, user) {
  const isAdmin = user.roles.includes('Admin');
  const query = Feedback.findById(feedbackId);
  if (isAdmin) query.populate('user_id', 'full_name email roles status');
  const feedback = await query;
  if (!feedback) return null;
  if (!isAdmin && String(feedback.user_id) !== String(user.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return serializeFeedback(feedback);
}

async function updateFeedback(feedbackId, payload) {
  const existing = await Feedback.findById(feedbackId);
  if (!existing) return null;

  if (payload.status !== undefined) existing.status = payload.status;
  if (payload.admin_note !== undefined) {
    existing.admin_note = payload.admin_note;
  }
  await existing.save();
  return serializeFeedback(existing);
}

async function replyToFeedback(feedbackId, actor, payload) {
  const feedback = await Feedback.findById(feedbackId).populate('user_id', 'full_name email');
  if (!feedback) return null;

  const isAdmin = Array.isArray(actor.roles) && actor.roles.includes('Admin');
  const ownerId = feedback.user_id?._id || feedback.user_id;
  if (!isAdmin && String(ownerId) !== String(actor.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const actorDoc = await User.findById(actor.id).select('full_name email').lean();
  const now = new Date();
  const senderRole = isAdmin ? 'Admin' : 'User';
  const message = {
    sender_role: senderRole,
    sender_id: actor.id,
    sender_name: actorDoc?.full_name || actorDoc?.email || actor.email || (isAdmin ? 'Admin' : 'Người dùng'),
    content: payload.content,
    created_at: now,
  };

  feedback.messages = ensureMessages(feedback);
  feedback.messages.push(message);
  feedback.last_message_at = now;
  feedback.last_sender_role = senderRole;

  if (isAdmin) {
    feedback.admin_note = payload.content;
    feedback.status = payload.status || (feedback.status === 'Pending' ? 'Reviewed' : feedback.status);
  } else {
    feedback.status = 'Pending';
  }

  await feedback.save();

  if (isAdmin) {
    await notifyUserFeedbackReply(ownerId, {
      ...feedback.toObject(),
      admin_note: payload.content,
      status: feedback.status,
    });
  } else {
    await notifyAdminsNewFeedback(feedback, message.sender_name);
  }

  const populated = await Feedback.findById(feedbackId).populate('user_id', 'full_name email roles status');
  return serializeFeedback(populated);
}

module.exports = {
  createFeedback,
  listFeedback,
  countPendingFeedback,
  getFeedbackById,
  updateFeedback,
  replyToFeedback,
  serializeFeedback,
};
