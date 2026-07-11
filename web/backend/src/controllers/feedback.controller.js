const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedback.service');

const create = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.createFeedback(req.user.id, req.body);
  return ApiResponse.created(res, feedback);
});

const list = asyncHandler(async (req, res) => {
  const { feedbacks, page, limit, total } = await feedbackService.listFeedback(req.user, req.query);
  return ApiResponse.paginated(res, feedbacks, page, limit, total);
});

const update = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.updateFeedback(req.params.id, req.body);
  if (!feedback) return ApiResponse.notFound(res);
  return ApiResponse.success(res, feedback);
});

module.exports = { create, list, update };
