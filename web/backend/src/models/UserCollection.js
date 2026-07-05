const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Sub-schema: saved paper entry ── */

const savedPaperSchema = new Schema(
  {
    paper_id: { type: Schema.Types.ObjectId, ref: 'Paper' },
    saved_at: { type: Date, default: Date.now },
    title_snapshot: { type: String, required: true },
    availability: {
      type: String,
      enum: ['Available', 'Archived', 'Unavailable'],
      default: 'Available',
    },
    status: {
      type: String,
      enum: ['unread', 'reading', 'done'],
      default: 'unread',
    },
    note: { type: String, default: '' },
  },
  { _id: false },
);

/* ── Main Schema ── */

const userCollectionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collection_name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    saved_papers: [savedPaperSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

/* ── Indexes ── */
userCollectionSchema.index({ user_id: 1 });
userCollectionSchema.index({ user_id: 1, 'saved_papers.saved_at': -1 });

module.exports = mongoose.model('UserCollection', userCollectionSchema);
