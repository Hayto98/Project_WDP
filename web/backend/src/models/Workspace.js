const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Sub-schema: workspace member ── */

const memberSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true }, // Denormalized
    initials: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
    },
    joined_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/* ── Main Schema ── */

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
    members: [memberSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

/* ── Indexes ── */
workspaceSchema.index({ owner_id: 1 });
workspaceSchema.index({ 'members.user_id': 1 });
workspaceSchema.index({ active: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
