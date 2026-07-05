const Feedback = require('../models/Feedback');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function create(req, res) {
  try {
    const feedback = await Feedback.create({
      user_id: req.user.id,
      content: req.body.content,
    });
    return ApiResponse.created(res, feedback);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function list(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const isAdmin = req.user.roles.includes('Admin');
    const filter = isAdmin ? {} : { user_id: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, feedbacks, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function update(req, res) {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, admin_note: req.body.admin_note },
      { new: true },
    );
    if (!feedback) return ApiResponse.notFound(res);
    return ApiResponse.success(res, feedback);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { create, list, update };
