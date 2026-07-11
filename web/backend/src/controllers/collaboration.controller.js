const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const collaborationService = require('../services/collaboration.service');

const getResearchers = asyncHandler(async (req, res) => {
  const researchers = await collaborationService.listResearchers(req.user.id, req.query);
  return ApiResponse.success(res, researchers);
});

const getInvites = asyncHandler(async (req, res) => {
  const invites = await collaborationService.listInvites(req.user.id, req.query);
  return ApiResponse.success(res, invites);
});

const createInvite = asyncHandler(async (req, res) => {
  try {
    const {
      workspace_id,
      invitee_email,
      invitee_name,
      invitee_user_id,
      direction,
      topic,
      message,
    } = req.body;
    const invite = await CollaborationInvite.create({
      workspace_id,
      invitee_email,
      invitee_name: invitee_name || '',
      invitee_user_id: invitee_user_id || null,
      direction,
      topic,
      message: message || '',
      sender_id: req.user.id,
    });
    return ApiResponse.created(res, invite);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500, err.code || 'INTERNAL_ERROR');
  }
});

const respondToInvite = asyncHandler(async (req, res) => {
  const invite = await collaborationService.respondToInvite(req.user.id, req.params.id, req.body.status);
  if (!invite) return ApiResponse.notFound(res);
  return ApiResponse.success(res, invite);
});

module.exports = { getResearchers, getInvites, createInvite, respondToInvite };
