const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function getNotifications(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user_id: req.user.id };
    if (req.query.kind) filter.notification_type = req.query.kind;
    if (req.query.unread === 'true') filter.is_read = false;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, items, page, limit, total);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function markRead(req, res) {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user_id: req.user.id },
      { is_read: true },
    );
    return ApiResponse.success(res, { message: 'Marked as read' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true },
    );
    return ApiResponse.success(res, { message: 'All notifications marked as read' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user.id,
      is_read: false,
    });
    return ApiResponse.success(res, { count });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = { getNotifications, markRead, markAllRead, getUnreadCount };
