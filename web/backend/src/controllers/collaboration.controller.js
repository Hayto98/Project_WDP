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
  const invite = await collaborationService.createInvite(req.user.id, req.body);
  return ApiResponse.created(res, invite);
});

const respondToInvite = asyncHandler(async (req, res) => {
  const invite = await collaborationService.respondToInvite(req.user.id, req.params.id, req.body.status);
  if (!invite) return ApiResponse.notFound(res);
  return ApiResponse.success(res, invite);
});

module.exports = { getResearchers, getInvites, createInvite, respondToInvite };
