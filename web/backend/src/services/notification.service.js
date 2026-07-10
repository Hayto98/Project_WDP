const Notification = require('../models/Notification');

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
  createNotification,
  notifyInviteReceived,
  notifyCommentAdded,
  notifyJobComplete,
};
