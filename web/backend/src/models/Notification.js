const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notification_type: {
      type: String,
      enum: ['paper', 'task', 'invite', 'comment', 'trend', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '', trim: true },
    source: { type: String, default: '', trim: true },
    actor: { type: String, default: '', trim: true },
    priority: {
      type: String,
      enum: ['high', 'normal', 'low'],
      default: 'normal',
    },
    target_label: { type: String, default: '' },
    target_href: { type: String, default: '' },
    meta: [String],
    follow_id: { type: String, default: null },
    related_paper_ids: [{ type: Schema.Types.ObjectId, ref: 'Paper' }],
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'notifications',
  },
);

/* ── Indexes ── */
notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });
// TTL: auto-delete after 30 days (BR-030)
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
