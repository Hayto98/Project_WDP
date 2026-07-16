const mongoose = require('mongoose');
const { Schema } = mongoose;

const paperViewSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paper_id: { type: Schema.Types.ObjectId, ref: 'Paper', required: true },
    viewed_at: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['Search_Result', 'Library', 'Recommendation', 'Dashboard'],
      default: 'Search_Result',
    },
    duration_minutes: { type: Number, default: 0 },
    duration_seconds: { type: Number, default: 0 },
    ended_at: { type: Date, default: null },
    session_window: { type: String, default: '' },
    device: { type: String, default: 'web' },
    persist_status: {
      type: String,
      enum: ['stored', 'queued', 'skipped'],
      default: 'stored',
    },
    reason: { type: String, default: '' },
  },
  {
    timestamps: false, // viewed_at is the timestamp
  },
);

/* ── Indexes ── */
// Top trending (BR-044): aggregate by paper_id within last 30 days
paperViewSchema.index({ paper_id: 1, viewed_at: -1 });
// User's reading history
paperViewSchema.index({ user_id: 1, paper_id: 1, viewed_at: -1 });
// Time range queries
paperViewSchema.index({ viewed_at: -1 });

module.exports = mongoose.model('PaperView', paperViewSchema);
