const Feedback = require('../models/Feedback');
const { parsePagination } = require('../utils/pagination');

async function createFeedback(userId, payload) {
  return Feedback.create({
    user_id: userId,
    content: payload.content,
  });
}

async function listFeedback(user, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const isAdmin = user.roles.includes('Admin');
  const filter = isAdmin ? {} : { user_id: user.id };
  if (query.status) filter.status = query.status;

  const feedbackQuery = Feedback.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit);
  if (isAdmin) feedbackQuery.populate('user_id', 'full_name email roles status');

  const [feedbacks, total] = await Promise.all([
    feedbackQuery.lean(),
    Feedback.countDocuments(filter),
  ]);

  return { feedbacks, page, limit, total };
}

async function updateFeedback(feedbackId, payload) {
  return Feedback.findByIdAndUpdate(
    feedbackId,
    {
      status: payload.status,
      admin_note: payload.admin_note,
    },
    { returnDocument: 'after' },
  );
}

module.exports = {
  createFeedback,
  listFeedback,
  updateFeedback,
};
