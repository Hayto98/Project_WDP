const Workspace = require('../models/Workspace');
const WorkspaceItem = require('../models/WorkspaceItem');
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

async function listWorkspaces(userId) {
  return Workspace.find({
    $or: [
      { owner_id: userId },
      { 'members.user_id': userId },
    ],
  }).sort({ updated_at: -1 }).lean();
}

async function createWorkspace(userId, payload) {
  return Workspace.create({
    name: payload.name,
    description: payload.description,
    active: payload.active,
    owner_id: userId,
    members: [{
      user_id: userId,
      name: payload.owner_name || 'Owner',
      initials: payload.owner_initials || 'OW',
      role: 'owner',
    }],
  });
}

async function getWorkspaceById(workspaceId) {
  return Workspace.findById(workspaceId).lean();
}

async function updateWorkspace(userId, workspaceId, payload) {
  return Workspace.findOneAndUpdate(
    { _id: workspaceId, 'members.user_id': userId },
    pickWorkspaceFields(payload),
    { new: true },
  );
}

async function deleteWorkspace(userId, workspaceId) {
  const result = await Workspace.deleteOne({ _id: workspaceId, owner_id: userId });
  if (result.deletedCount > 0) {
    await WorkspaceItem.deleteMany({ workspace_id: workspaceId });
  }
  return result;
}

async function addMember(userId, workspaceId, payload) {
  return Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId },
    { $push: { members: pickMemberFields(payload) } },
    { new: true },
  );
}

async function updateMember(userId, workspaceId, memberId, payload) {
  return Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId, 'members.user_id': memberId },
    { $set: { 'members.$.role': payload.role } },
    { new: true },
  );
}

async function removeMember(userId, workspaceId, memberId) {
  return Workspace.findOneAndUpdate(
    { _id: workspaceId, owner_id: userId },
    { $pull: { members: { user_id: memberId } } },
    { new: true },
  );
}

async function listItems(workspaceId, query = {}) {
  const filter = { workspace_id: workspaceId };
  if (query.status) filter.status = query.status;
  if (query.kind) filter.kind = query.kind;

  return WorkspaceItem.find(filter).sort({ updated_at: -1 }).lean();
}

async function createItem(workspaceId, payload) {
  return WorkspaceItem.create({
    ...pickItemFields(payload),
    workspace_id: workspaceId,
  });
}

async function updateItem(workspaceId, itemId, payload) {
  return WorkspaceItem.findOneAndUpdate(
    { _id: itemId, workspace_id: workspaceId },
    pickItemFields(payload),
    { new: true },
  );
}

async function deleteItem(workspaceId, itemId) {
  await WorkspaceItem.deleteOne({ _id: itemId, workspace_id: workspaceId });
  return { message: 'Item deleted' };
}

async function addComment(user, workspaceId, itemId, payload) {
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
    { new: true },
  );
  if (!item) return null;

  const comment = item.comments[item.comments.length - 1];
  const recipients = (workspace?.members || [])
    .map((member) => member.user_id?.toString())
    .filter((memberUserId) => memberUserId && memberUserId !== user.id);

  for (const recipientId of new Set(recipients)) {
    notifyCommentAdded(recipientId, item, comment.author_name || user.email);
  }

  return comment;
}

async function listActivities(workspaceId) {
  const items = await WorkspaceItem.find({ workspace_id: workspaceId })
    .sort({ updated_at: -1 })
    .limit(20)
    .lean();

  return items.map((item) => ({
    id: item._id,
    workspace_id: item.workspace_id,
    action: `cập nhật ${item.kind}: ${item.title}`,
    when: item.updated_at,
  }));
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
