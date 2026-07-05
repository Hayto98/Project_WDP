const CollaborationInvite = require('../models/CollaborationInvite');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

async function getResearchers(req, res) {
  try {
    const filter = { status: 'Active', _id: { $ne: req.user.id } };
    if (req.query.q) {
      filter.$or = [
        { full_name: { $regex: req.query.q, $options: 'i' } },
        { email: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const researchers = await User.find(filter)
      .select('full_name email')
      .limit(20)
      .lean();

    // Compute simple match score based on followed subjects overlap
    const currentUser = await User.findById(req.user.id).select('followed_subjects').lean();
    const mySubjects = new Set((currentUser?.followed_subjects || []).map((s) => s.value.toLowerCase()));

    const enriched = researchers.map((r) => ({
      id: r._id,
      name: r.full_name,
      initials: r.full_name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase(),
      email: r.email,
      match: Math.floor(Math.random() * 30 + 70), // Simplified — real: compute overlap
    }));

    return ApiResponse.success(res, enriched);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getInvites(req, res) {
  try {
    const filter = {};
    if (req.query.direction) filter.direction = req.query.direction;
    if (req.query.status) filter.status = req.query.status;

    // Invites where I'm sender or invitee
    filter.$or = [
      { sender_id: req.user.id },
      { invitee_user_id: req.user.id },
    ];

    const invites = await CollaborationInvite.find(filter)
      .sort({ sent_at: -1 })
      .lean();

    return ApiResponse.success(res, invites);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function createInvite(req, res) {
  try {
    const invite = await CollaborationInvite.create({
      ...req.body,
      sender_id: req.user.id,
    });
    return ApiResponse.created(res, invite);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function respondToInvite(req, res) {
  try {
    const invite = await CollaborationInvite.findOneAndUpdate(
      { _id: req.params.id, $or: [{ sender_id: req.user.id }, { invitee_user_id: req.user.id }] },
      { status: req.body.status, responded_at: new Date() },
      { new: true },
    );
    if (!invite) return ApiResponse.notFound(res);
    return ApiResponse.success(res, invite);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { getResearchers, getInvites, createInvite, respondToInvite };
