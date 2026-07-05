const followService = require('../services/follow.service');
const ApiResponse = require('../utils/apiResponse');

async function getSubjects(req, res) {
  try {
    const subjects = await followService.getSubjects(req.user.id);
    return ApiResponse.success(res, subjects);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function addSubject(req, res) {
  try {
    const subject = await followService.addSubject(req.user.id, req.body);
    return ApiResponse.created(res, subject);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updateSubject(req, res) {
  try {
    const subject = await followService.updateSubject(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, subject);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function removeSubject(req, res) {
  try {
    await followService.removeSubject(req.user.id, req.params.id);
    return ApiResponse.success(res, { message: 'Subject unfollowed' });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getAlerts(req, res) {
  try {
    const alerts = await followService.getAlerts(req.user.id, req.query);
    return ApiResponse.success(res, alerts);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function markAlertRead(req, res) {
  try {
    await followService.markAlertRead(req.user.id, req.params.id);
    return ApiResponse.success(res, { message: 'Alert marked as read' });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function markAllRead(req, res) {
  try {
    await followService.markAllAlertsRead(req.user.id);
    return ApiResponse.success(res, { message: 'All alerts marked as read' });
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = { getSubjects, addSubject, updateSubject, removeSubject, getAlerts, markAlertRead, markAllRead };
