const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Sub-schema: comment ── */

const commentSchema = new Schema(
  {
    comment_id: { type: String, default: () => new mongoose.Types.UUID().toString() },
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    author_name: { type: String, default: '' }, // Denormalized
    content: { type: String, required: true, trim: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/* ── Main Schema ── */

const workspaceItemSchema = new Schema(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    kind: {
      type: String,
      enum: ['task', 'note', 'discussion'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['backlog', 'doing', 'done'],
      default: 'backlog',
    },
    assignee_id: { type: Schema.Types.ObjectId, ref: 'User' }, // legacy single – kept for backward compat
    assignee_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }], // multi-assignee (new)
    paper_id: { type: Schema.Types.ObjectId, ref: 'Paper' },
    due: { type: String, default: '' }, // e.g. "08/07"
    comments: [commentSchema],
    note: { type: String, default: '', trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'workspace_items',
  },
);

/* ── Indexes ── */
workspaceItemSchema.index({ workspace_id: 1, status: 1 });
workspaceItemSchema.index({ assignee_ids: 1 });
workspaceItemSchema.index({ paper_id: 1 });

module.exports = mongoose.model('WorkspaceItem', workspaceItemSchema);
