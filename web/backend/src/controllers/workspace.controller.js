const Workspace = require('../models/Workspace');
const WorkspaceItem = require('../models/WorkspaceItem');
const ApiResponse = require('../utils/apiResponse');

// ── Workspace CRUD ──

async function getWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner_id: req.user.id },
        { 'members.user_id': req.user.id },
      ],
    }).sort({ updated_at: -1 }).lean();
    return ApiResponse.success(res, workspaces);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function createWorkspace(req, res) {
  try {
    const ws = await Workspace.create({
      ...req.body,
      owner_id: req.user.id,
      members: [{
        user_id: req.user.id,
        name: req.body.owner_name || 'Owner',
        initials: req.body.owner_initials || 'OW',
        role: 'owner',
      }],
    });
    return ApiResponse.created(res, ws);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function getWorkspaceById(req, res) {
  try {
    const ws = await Workspace.findById(req.params.id).lean();
    if (!ws) return ApiResponse.notFound(res, 'Workspace not found');
    return ApiResponse.success(res, ws);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function updateWorkspace(req, res) {
  try {
    const ws = await Workspace.findOneAndUpdate(
      { _id: req.params.id, 'members.user_id': req.user.id },
      { name: req.body.name, description: req.body.description, active: req.body.active },
      { new: true },
    );
    if (!ws) return ApiResponse.notFound(res);
    return ApiResponse.success(res, ws);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function deleteWorkspace(req, res) {
  try {
    const result = await Workspace.deleteOne({ _id: req.params.id, owner_id: req.user.id });
    if (result.deletedCount === 0) return ApiResponse.forbidden(res, 'Only owner can delete');
    // Also delete all items
    await WorkspaceItem.deleteMany({ workspace_id: req.params.id });
    return ApiResponse.success(res, { message: 'Workspace deleted' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Members ──

async function addMember(req, res) {
  try {
    const ws = await Workspace.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user.id },
      { $push: { members: req.body } },
      { new: true },
    );
    if (!ws) return ApiResponse.forbidden(res, 'Only owner can add members');
    return ApiResponse.created(res, ws.members);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function updateMember(req, res) {
  try {
    const ws = await Workspace.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user.id, 'members.user_id': req.params.memberId },
      { $set: { 'members.$.role': req.body.role } },
      { new: true },
    );
    if (!ws) return ApiResponse.notFound(res);
    return ApiResponse.success(res, ws.members);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function removeMember(req, res) {
  try {
    const ws = await Workspace.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user.id },
      { $pull: { members: { user_id: req.params.memberId } } },
      { new: true },
    );
    if (!ws) return ApiResponse.forbidden(res);
    return ApiResponse.success(res, { message: 'Member removed' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Work Items ──

async function getItems(req, res) {
  try {
    const filter = { workspace_id: req.params.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.kind) filter.kind = req.query.kind;

    const items = await WorkspaceItem.find(filter).sort({ updated_at: -1 }).lean();
    return ApiResponse.success(res, items);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function createItem(req, res) {
  try {
    const item = await WorkspaceItem.create({
      ...req.body,
      workspace_id: req.params.id,
    });
    return ApiResponse.created(res, item);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function updateItem(req, res) {
  try {
    const item = await WorkspaceItem.findOneAndUpdate(
      { _id: req.params.itemId, workspace_id: req.params.id },
      req.body,
      { new: true },
    );
    if (!item) return ApiResponse.notFound(res);
    return ApiResponse.success(res, item);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function deleteItem(req, res) {
  try {
    await WorkspaceItem.deleteOne({ _id: req.params.itemId, workspace_id: req.params.id });
    return ApiResponse.success(res, { message: 'Item deleted' });
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

async function addComment(req, res) {
  try {
    const item = await WorkspaceItem.findOneAndUpdate(
      { _id: req.params.itemId, workspace_id: req.params.id },
      {
        $push: {
          comments: {
            author_id: req.user.id,
            author_name: req.body.author_name || '',
            content: req.body.content,
          },
        },
      },
      { new: true },
    );
    if (!item) return ApiResponse.notFound(res);
    return ApiResponse.created(res, item.comments[item.comments.length - 1]);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

// ── Activities (read from system_logs or computed) ──

async function getActivities(req, res) {
  try {
    // Simplified: derive from workspace items' recent updates
    const items = await WorkspaceItem.find({ workspace_id: req.params.id })
      .sort({ updated_at: -1 })
      .limit(20)
      .lean();

    const activities = items.map((i) => ({
      id: i._id,
      workspace_id: i.workspace_id,
      action: `cập nhật ${i.kind}: ${i.title}`,
      when: i.updated_at,
    }));

    return ApiResponse.success(res, activities);
  } catch (err) {
    return ApiResponse.error(res, err.message, 500);
  }
}

module.exports = {
  getWorkspaces, createWorkspace, getWorkspaceById, updateWorkspace, deleteWorkspace,
  addMember, updateMember, removeMember,
  getItems, createItem, updateItem, deleteItem, addComment,
  getActivities,
};
