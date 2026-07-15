const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedback.service');

const create = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.createFeedback(req.user.id, req.body, req.user);
  return ApiResponse.created(res, feedback);
});

const list = asyncHandler(async (req, res) => {
  const { feedbacks, page, limit, total } = await feedbackService.listFeedback(req.user, req.query);
  return ApiResponse.paginated(res, feedbacks, page, limit, total);
});

const pendingCount = asyncHandler(async (req, res) => {
  const count = await feedbackService.countPendingFeedback();
  return ApiResponse.success(res, { count });
});

const getById = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.getFeedbackById(req.params.id, req.user);
  if (!feedback) return ApiResponse.notFound(res);
  return ApiResponse.success(res, feedback);
});

const update = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.updateFeedback(req.params.id, req.body);
  if (!feedback) return ApiResponse.notFound(res);
  return ApiResponse.success(res, feedback);
});

const reply = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.replyToFeedback(req.params.id, req.user, req.body);
  if (!feedback) return ApiResponse.notFound(res);
  return ApiResponse.success(res, feedback);
});

module.exports = { create, list, pendingCount, getById, update, reply };
