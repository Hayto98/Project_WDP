const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const workspaceService = require('../services/workspace.service');

const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listWorkspaces(req.user.id);
  return ApiResponse.success(res, workspaces);
});

const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(req.user.id, req.body);
  return ApiResponse.created(res, workspace);
});

const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.id);
  if (!workspace) return ApiResponse.notFound(res, 'Workspace not found');
  return ApiResponse.success(res, workspace);
});

const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(req.user.id, req.params.id, req.body);
  if (!workspace) return ApiResponse.notFound(res);
  return ApiResponse.success(res, workspace);
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const result = await workspaceService.deleteWorkspace(req.user.id, req.params.id);
  if (result.deletedCount === 0) return ApiResponse.forbidden(res, 'Only owner can delete');
  return ApiResponse.success(res, { message: 'Workspace deleted' });
});

const addMember = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.addMember(req.user.id, req.params.id, req.body);
  if (!workspace) return ApiResponse.forbidden(res, 'Only owner can add members');
  return ApiResponse.created(res, workspace.members);
});

const updateMember = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateMember(req.user.id, req.params.id, req.params.memberId, req.body);
  if (!workspace) return ApiResponse.notFound(res);
  return ApiResponse.success(res, workspace.members);
});

const removeMember = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.removeMember(req.user.id, req.params.id, req.params.memberId);
  if (!workspace) return ApiResponse.forbidden(res);
  return ApiResponse.success(res, { message: 'Member removed' });
});

const getItems = asyncHandler(async (req, res) => {
  const items = await workspaceService.listItems(req.params.id, req.query);
  return ApiResponse.success(res, items);
});

const createItem = asyncHandler(async (req, res) => {
  const item = await workspaceService.createItem(req.params.id, req.body);
  return ApiResponse.created(res, item);
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await workspaceService.updateItem(req.params.id, req.params.itemId, req.body);
  if (!item) return ApiResponse.notFound(res);
  return ApiResponse.success(res, item);
});

const deleteItem = asyncHandler(async (req, res) => {
  const result = await workspaceService.deleteItem(req.params.id, req.params.itemId);
  return ApiResponse.success(res, result);
});

const addComment = asyncHandler(async (req, res) => {
  const comment = await workspaceService.addComment(req.user, req.params.id, req.params.itemId, req.body);
  if (!comment) return ApiResponse.notFound(res);
  return ApiResponse.created(res, comment);
});

const getActivities = asyncHandler(async (req, res) => {
  const activities = await workspaceService.listActivities(req.params.id);
  return ApiResponse.success(res, activities);
});

module.exports = {
  getWorkspaces, createWorkspace, getWorkspaceById, updateWorkspace, deleteWorkspace,
  addMember, updateMember, removeMember,
  getItems, createItem, updateItem, deleteItem, addComment,
  getActivities,
};
