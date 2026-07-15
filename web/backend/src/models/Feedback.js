const mongoose = require('mongoose');
const { Schema } = mongoose;

const feedbackMessageSchema = new Schema(
  {
    sender_role: {
      type: String,
      enum: ['User', 'Admin'],
      required: true,
    },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sender_name: { type: String, default: '' },
    content: { type: String, required: true, trim: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const feedbackSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Kept for backward compatibility with older records / UIs.
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
    },
    admin_note: { type: String, default: null },
    messages: { type: [feedbackMessageSchema], default: [] },
    last_message_at: { type: Date, default: Date.now },
    last_sender_role: {
      type: String,
      enum: ['User', 'Admin'],
      default: 'User',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

feedbackSchema.index({ status: 1, last_message_at: -1 });
feedbackSchema.index({ user_id: 1, last_message_at: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
