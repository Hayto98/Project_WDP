const Workspace = require('../models/Workspace');
const WorkspaceItem = require('../models/WorkspaceItem');
const WorkspaceActivity = require('../models/WorkspaceActivity');
const { notifyCommentAdded } = require('./notification.service');

function pickWorkspaceFields(payload = {}) {
  const fields = {};
  if (payload.name !== undefined) fields.name = payload.name;
  if (payload.description !== undefined) fields.description = payload.description;
  if (payload.active !== undefined) fields.active = payload.active;
  return fields;
}

function pickMemberFields(payload = {}) {
  return {
    user_id: payload.user_id,
    name: payload.name,
    initials: payload.initials,
    role: payload.role || 'viewer',
  };
}

function pickItemFields(payload = {}) {
  const fields = {};
  if (payload.kind !== undefined) fields.kind = payload.kind;
  if (payload.title !== undefined) fields.title = payload.title;
  if (payload.status !== undefined) fields.status = payload.status;
  if (payload.assignee_id !== undefined) fields.assignee_id = payload.assignee_id;
  if (payload.paper_id !== undefined) fields.paper_id = payload.paper_id;
  if (payload.due !== undefined) fields.due = payload.due;
  if (payload.note !== undefined) fields.note = payload.note;
  return fields;
}

function actorName(user) {
  return user?.name || user?.email || 'Workspace';
}

async function getMemberRole(userId, workspaceId) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    'members.user_id': userId,
  }).select('members owner_id').lean();
  if (!workspace) return null;
  if (workspace.owner_id?.toString() === userId?.toString()) return 'owner';
  return workspace.members
    .find((member) => member.user_id?.toString() === userId?.toString())
    ?.role || null;
}

function canWriteItems(role) {
  return role === 'owner' || role === 'editor';
}

async function recordActivity(workspaceId, user, action, targetType, target = {}, details = {}) {
  return WorkspaceActivity.create({
    workspace_id: workspaceId,
    actor_id: user?.id || user?._id || undefined,
    actor_name: actorName(user),
    action,
    target_type: targetType,
    target_id: target.id || target._id || '',
    target_title: target.title || target.name || '',
    details,
  });
}

async function listWorkspaces(userId) {
  return Workspace.find({
    $or: [
      { owner_id: userId },
      { 'members.user_id': userId },
    ],
  }).sort({ updated_at: -1 }).lean();
}

async function createWorkspace(user, payload) {
  const userId = user.id || user._id;
  const workspace = await Workspace.create({
    name: payload.name,
    description: payload.description,
    active: payload.active,
    owner_id: userId,
    members: [{
      user_id: userId,
      name: payload.owner_name || user.name || user.email || 'Owner',
      initials: payload.owner_initials || 'OW',
      role: 'owner',
    }],
  });
  await recordActivity(workspace._id, user, 'workspace_created', 'workspace', workspace);
  return workspace;
}

async function getWorkspaceById(userId, workspaceId) {
  return Workspace.findOne({ _id: workspaceId, 'members.user_id': userId }).lean();
}

async function updateWorkspace(userId, workspaceId, payload, user = null) {
  const role = await getMemberRole(userId, workspaceId);
  if (!canWriteItems(role)) return null;
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, 'members.user_id': userId },
    pickWorkspaceFields(payload),
    { returnDocument: 'after' },
  );
  if (workspace) await recordActivity(workspaceId, user || { id: userId }, 'workspace_updated', 'workspace', workspace);
  return workspace;
}

async function deleteWorkspace(userId, workspaceId, user = null) {
  const workspace = await Workspace.findOne({ _id: workspaceId, owner_id: userId }).lean();
  const result = await Workspace.deleteOne({ _id: workspaceId, owner_id: userId });
  if (result.deletedCount > 0) {
    await WorkspaceItem.deleteMany({ workspace_id: workspaceId });
    await recordActivity(workspaceId, user || { id: userId }, 'workspace_deleted', 'workspace', workspace || { _id: workspaceId });
  }
  return result;
}

async function addMember(userId, workspaceId, payload, user = null) {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId },
    { $push: { members: pickMemberFields(payload) } },
    { returnDocument: 'after' },
  );
  if (workspace) await recordActivity(workspaceId, user || { id: userId }, 'member_added', 'member', {
    id: payload.user_id,
    name: payload.name,
  }, { role: payload.role || 'viewer' });
  return workspace;
}

async function updateMember(userId, workspaceId, memberId, payload, user = null) {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId, 'members.user_id': memberId },
    { $set: { 'members.$.role': payload.role } },
    { returnDocument: 'after' },
  );
  if (workspace) await recordActivity(workspaceId, user || { id: userId }, 'member_updated', 'member', {
    id: memberId,
    name: workspace.members.find((member) => member.user_id?.toString() === memberId)?.name || '',
  }, { role: payload.role });
  return workspace;
}

async function removeMember(userId, workspaceId, memberId, user = null) {
  const workspaceBefore = await Workspace.findOne({ _id: workspaceId, owner_id: userId }).select('members').lean();
  const removed = workspaceBefore?.members?.find((member) => member.user_id?.toString() === memberId);
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId },
    { $pull: { members: { user_id: memberId } } },
    { returnDocument: 'after' },
  );
  if (workspace) await recordActivity(workspaceId, user || { id: userId }, 'member_removed', 'member', {
    id: memberId,
    name: removed?.name || '',
  });
  return workspace;
}

async function listItems(userId, workspaceId, query = {}) {
  const role = await getMemberRole(userId, workspaceId);
  if (!role) return null;
  const filter = { workspace_id: workspaceId };
  if (query.status) filter.status = query.status;
  if (query.kind) filter.kind = query.kind;

  return WorkspaceItem.find(filter).sort({ updated_at: -1 }).lean();
}

async function createItem(workspaceId, payload, user = null) {
  const role = await getMemberRole(user?.id || user?._id, workspaceId);
  if (!canWriteItems(role)) return null;
  const item = await WorkspaceItem.create({
    ...pickItemFields(payload),
    workspace_id: workspaceId,
  });
  await recordActivity(workspaceId, user, 'item_created', 'item', item, { kind: item.kind, status: item.status });
  return item;
}

async function updateItem(workspaceId, itemId, payload, user = null) {
  const role = await getMemberRole(user?.id || user?._id, workspaceId);
  if (!canWriteItems(role)) return null;
  const item = await WorkspaceItem.findOneAndUpdate(
    { _id: itemId, workspace_id: workspaceId },
    pickItemFields(payload),
    { returnDocument: 'after' },
  );
  if (item) await recordActivity(workspaceId, user, 'item_updated', 'item', item, {
    fields: Object.keys(pickItemFields(payload)),
    status: item.status,
  });
  return item;
}

async function deleteItem(workspaceId, itemId, user = null) {
  const role = await getMemberRole(user?.id || user?._id, workspaceId);
  if (!canWriteItems(role)) return null;
  const item = await WorkspaceItem.findOne({ _id: itemId, workspace_id: workspaceId }).lean();
  await WorkspaceItem.deleteOne({ _id: itemId, workspace_id: workspaceId });
  if (item) await recordActivity(workspaceId, user, 'item_deleted', 'item', item, { kind: item.kind });
  return { message: 'Item deleted' };
}

async function addComment(user, workspaceId, itemId, payload) {
  const role = await getMemberRole(user.id, workspaceId);
  if (!role) return null;
  const workspace = await Workspace.findById(workspaceId).select('members').lean();
  const item = await WorkspaceItem.findOneAndUpdate(
    { _id: itemId, workspace_id: workspaceId },
    {
      $push: {
        comments: {
          author_id: user.id,
          author_name: payload.author_name || '',
          content: payload.content,
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!item) return null;

  const comment = item.comments[item.comments.length - 1];
  const recipients = (workspace?.members || [])
    .map((member) => member.user_id?.toString())
    .filter((memberUserId) => memberUserId && memberUserId !== user.id);

  for (const recipientId of new Set(recipients)) {
    notifyCommentAdded(recipientId, item, comment.author_name || user.email);
  }

  await recordActivity(workspaceId, user, 'comment_added', 'comment', {
    id: comment.comment_id,
    title: item.title,
  }, { item_id: itemId });

  return comment;
}

async function listActivities(userId, workspaceId) {
  const role = await getMemberRole(userId, workspaceId);
  if (!role) return null;
  const activities = await WorkspaceActivity.find({ workspace_id: workspaceId })
    .sort({ created_at: -1 })
    .limit(20)
    .lean();

  return activities.map((activity) => ({
    id: activity._id,
    workspace_id: activity.workspace_id,
    actor: activity.actor_name,
    action: formatActivityAction(activity),
    when: activity.created_at,
    type: activity.action,
    target_type: activity.target_type,
    target_id: activity.target_id,
    details: activity.details || {},
  }));
}

function formatActivityAction(activity) {
  const target = activity.target_title ? `: ${activity.target_title}` : '';
  const labels = {
    workspace_created: 'tạo workspace',
    workspace_updated: 'cập nhật workspace',
    workspace_deleted: 'xóa workspace',
    member_added: 'thêm thành viên',
    member_updated: 'cập nhật thành viên',
    member_removed: 'xóa thành viên',
    item_created: 'tạo mục',
    item_updated: 'cập nhật mục',
    item_deleted: 'xóa mục',
    comment_added: 'thêm bình luận',
  };
  return `${labels[activity.action] || activity.action}${target}`;
}

module.exports = {
  listWorkspaces,
  createWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMember,
  removeMember,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  addComment,
  listActivities,
};
