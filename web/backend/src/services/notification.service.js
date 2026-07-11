const Notification = require('../models/Notification');

async function listNotifications(userId, { skip = 0, limit = 20, kind, unread } = {}) {
  const filter = { user_id: userId };
  if (kind) filter.notification_type = kind;
  if (unread === 'true') filter.is_read = false;

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return { items, total };
}

async function markNotificationRead(userId, notificationId) {
  await Notification.updateOne(
    { _id: notificationId, user_id: userId },
    { is_read: true },
  );
  return { message: 'Marked as read' };
}

async function markAllNotificationsRead(userId) {
  await Notification.updateMany(
    { user_id: userId, is_read: false },
    { is_read: true },
  );
  return { message: 'All notifications marked as read' };
}

async function countUnreadNotifications(userId) {
  return Notification.countDocuments({
    user_id: userId,
    is_read: false,
  });
}

async function createNotification(userId, type, title, content, extra = {}) {
  if (!userId) return null;
  try {
    return await Notification.create({
      user_id: userId,
      notification_type: type,
      title,
      content: content || '',
      priority: extra.priority || 'normal',
      source: extra.source || 'Hệ thống',
      actor: extra.actor || 'Research Corpus',
      target_label: extra.targetLabel || '',
      target_href: extra.targetHref || '',
      meta: extra.meta || [],
      follow_id: extra.followId || null,
      related_paper_ids: extra.relatedPaperIds || [],
    });
  } catch (err) {
    console.warn('⚠️  Notification creation failed:', err.message);
    return null;
  }
}

function notifyInviteReceived(userId, invite) {
  return createNotification(
    userId,
    'invite',
    'Lời mời cộng tác mới',
    `Bạn được mời tham gia chủ đề "${invite.topic}"`,
    {
      source: 'Cộng tác',
      actor: invite.invitee_name || invite.invitee_email,
      targetLabel: 'Xem lời mời',
      targetHref: '#workspace',
    },
  );
}

function notifyCommentAdded(userId, workspaceItem, commentAuthor) {
  return createNotification(
    userId,
    'comment',
    `Bình luận mới: "${workspaceItem.title}"`,
    `${commentAuthor || 'Một thành viên'} đã bình luận trên ${workspaceItem.kind}`,
    {
      source: 'Workspace',
      actor: commentAuthor || 'Workspace',
      targetLabel: 'Xem bình luận',
      targetHref: '#workspace',
    },
  );
}

function notifyJobComplete(userId, job) {
  return createNotification(
    userId,
    'system',
    `Job "${job.name}" hoàn thành`,
    `Đã import ${job.result?.imported || job.records_processed || 0} bài báo từ ${job.source_name}`,
    {
      source: 'Hệ thống',
      actor: 'Crawler',
      priority: job.status === 'failed' ? 'high' : 'normal',
      targetLabel: 'Xem job',
      targetHref: '#admin',
    },
  );
}

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  createNotification,
  notifyInviteReceived,
  notifyCommentAdded,
  notifyJobComplete,
};
