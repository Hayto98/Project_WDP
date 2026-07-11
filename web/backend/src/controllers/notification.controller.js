const ApiResponse = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const notificationService = require('../services/notification.service');

async function getNotifications(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await notificationService.listNotifications(req.user.id, {
      skip,
      limit,
      kind: req.query.kind,
      unread: req.query.unread,
    });
    return ApiResponse.paginated(res, items, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function markRead(req, res) {
  try {
    const result = await notificationService.markNotificationRead(req.user.id, req.params.id);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function markAllRead(req, res) {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user.id);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getUnreadCount(req, res) {
  try {
    const count = await notificationService.countUnreadNotifications(req.user.id);
    return ApiResponse.success(res, { count });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { getNotifications, markRead, markAllRead, getUnreadCount };
