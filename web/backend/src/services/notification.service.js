const Notification = require('../models/Notification');

/** User mailbox kinds (excludes import/job logs and paper digests). */
const MAILBOX_TYPES = ['task', 'invite', 'comment', 'system'];

/** Types that bump the sidebar badge. System only counts admin broadcasts. */
const BADGE_NOTIFICATION_TYPES = ['task', 'invite', 'comment', 'system'];

function mailboxFilter(userId, { kind, unread } = {}) {
  const filter = {
    user_id: userId,
    $or: [
      { notification_type: { $in: ['task', 'invite', 'comment'] } },
      {
        notification_type: 'system',
        meta: 'broadcast',
      },
    ],
  };

  if (kind) {
    if (kind === 'system') {
      filter.$or = [{ notification_type: 'system', meta: 'broadcast' }];
    } else if (['task', 'invite', 'comment'].includes(kind)) {
      filter.$or = [{ notification_type: kind }];
    } else {
      // paper / trend / unknown — not part of mailbox
      filter._id = null;
    }
  }

  if (unread === 'true' || unread === true) {
    filter.is_read = false;
  }

  return filter;
}

async function listNotifications(userId, { skip = 0, limit = 20, kind, unread } = {}) {
  const filter = mailboxFilter(userId, { kind, unread });

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
    mailboxFilter(userId, { unread: true }),
    { is_read: true },
  );
  return { message: 'All notifications marked as read' };
}

async function countUnreadNotifications(userId) {
  return Notification.countDocuments(mailboxFilter(userId, { unread: true }));
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

/**
 * Import/sync job completion is an admin ops signal, not user mailbox content.
 * Kept as a no-op so callers (paper sync, scheduler) do not fill the inbox.
 */
function notifyJobComplete() {
  return null;
}

function notifyTaskAssigned(userId, item, assignerName) {
  return createNotification(
    userId,
    'task',
    `Bạn được giao task: "${item.title}"`,
    `${assignerName || 'Một thành viên'} đã giao task cho bạn.`,
    {
      source: 'Workspace',
      actor: assignerName || 'Workspace',
      priority: 'high',
      targetLabel: 'Mở workspace',
      targetHref: '#workspace',
      meta: [item.kind || 'task', item.status || 'backlog'].filter(Boolean),
    },
  );
}

async function notifyAdminsNewFeedback(feedback, submitterName = 'Người dùng') {
  const User = require('../models/User');
  const admins = await User.find({
    roles: 'Admin',
    status: 'Active',
  }).select('_id').lean();

  const excerpt = String(feedback.content || '').trim().slice(0, 160);
  await Promise.all(admins.map((admin) => createNotification(
    admin._id,
    'comment',
    'Có phản hồi người dùng mới',
    `${submitterName}: ${excerpt}`,
    {
      source: 'Phản hồi',
      actor: submitterName,
      priority: 'high',
      targetLabel: 'Mở phản hồi',
      targetHref: '#admin',
      meta: ['Pending'],
    },
  )));
}

function notifyUserFeedbackReply(userId, feedback) {
  const excerpt = String(feedback.admin_note || '').trim().slice(0, 180);
  return createNotification(
    userId,
    'comment',
    'Bạn có tin nhắn phản hồi mới từ Admin',
    excerpt || 'Admin vừa trả lời hội thoại phản hồi của bạn.',
    {
      source: 'Phản hồi',
      actor: 'Admin',
      priority: 'high',
      targetLabel: 'Mở chat phản hồi',
      targetHref: '#account',
      meta: ['Tin nhắn mới', feedback.status || 'Reviewed'],
    },
  );
}

/**
 * Admin broadcasts a system signal (maintenance, outage, policy) to all active users.
 */
async function broadcastSystemSignal({ title, content, priority = 'high', actorName = 'Admin' } = {}) {
  const User = require('../models/User');
  const cleanTitle = String(title || '').trim();
  const cleanContent = String(content || '').trim();
  if (!cleanTitle) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }

  const users = await User.find({ status: 'Active' }).select('_id').lean();
  const docs = users.map((user) => ({
    user_id: user._id,
    notification_type: 'system',
    title: cleanTitle,
    content: cleanContent,
    priority: ['high', 'normal', 'low'].includes(priority) ? priority : 'high',
    source: 'Tín hiệu hệ thống',
    actor: actorName || 'Admin',
    target_label: 'Đã hiểu',
    target_href: '#notifications',
    meta: ['broadcast'],
    is_read: false,
    created_at: new Date(),
  }));

  if (docs.length === 0) {
    return { sent: 0 };
  }

  await Notification.insertMany(docs, { ordered: false });
  return { sent: docs.length };
}

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  createNotification,
  notifyInviteReceived,
  notifyCommentAdded,
  notifyTaskAssigned,
  notifyJobComplete,
  notifyAdminsNewFeedback,
  notifyUserFeedbackReply,
  broadcastSystemSignal,
  MAILBOX_TYPES,
  BADGE_NOTIFICATION_TYPES,
};
