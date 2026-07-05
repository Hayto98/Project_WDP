const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * CollaborationInvite — research collaboration requests
 * from workspaceSample.ts CollaborationInvite + ResearcherProfile.
 */

const collaborationInviteSchema = new Schema(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitee_email: { type: String, required: true, lowercase: true, trim: true },
    invitee_name: { type: String, default: '', trim: true },
    invitee_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    topic: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    sent_at: { type: Date, default: Date.now },
    responded_at: Date,
  },
  {
    timestamps: false,
    collection: 'collaboration_invites',
  },
);

/* ── Indexes ── */
collaborationInviteSchema.index({ workspace_id: 1 });
collaborationInviteSchema.index({ invitee_email: 1 });
collaborationInviteSchema.index({ sender_id: 1 });
collaborationInviteSchema.index({ status: 1 });

module.exports = mongoose.model('CollaborationInvite', collaborationInviteSchema);
