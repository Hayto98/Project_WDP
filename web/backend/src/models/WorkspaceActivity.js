const mongoose = require('mongoose');
const { Schema } = mongoose;

const workspaceActivitySchema = new Schema(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    actor_name: { type: String, default: 'Workspace', trim: true },
    action: {
      type: String,
      enum: [
        'workspace_created',
        'workspace_updated',
        'workspace_deleted',
        'member_added',
        'member_updated',
        'member_removed',
        'item_created',
        'item_updated',
        'item_deleted',
        'comment_added',
      ],
      required: true,
    },
    target_type: {
      type: String,
      enum: ['workspace', 'member', 'item', 'comment'],
      required: true,
    },
    target_id: { type: String, default: '' },
    target_title: { type: String, default: '', trim: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'workspace_activities',
  },
);

workspaceActivitySchema.index({ workspace_id: 1, created_at: -1 });
workspaceActivitySchema.index({ actor_id: 1, created_at: -1 });

module.exports = mongoose.model('WorkspaceActivity', workspaceActivitySchema);
