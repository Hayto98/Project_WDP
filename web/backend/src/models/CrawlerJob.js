const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * CrawlerJob — tracks batch data ingestion jobs (FR-001, BR-004).
 * Maps to AdminJob in frontend adminSample.ts.
 */

const crawlerJobSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    source_id: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    source_name: { type: String, required: true, trim: true }, // Denormalized
    status: {
      type: String,
      enum: ['queued', 'running', 'success', 'warning', 'failed'],
      default: 'queued',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    records_processed: { type: Number, default: 0 },
    started_at: Date,
    completed_at: Date,
    duration_seconds: { type: Number, default: 0 },
    owner: { type: String, default: 'Scheduler', trim: true },
    error_message: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'crawler_jobs',
  },
);

/* ── Indexes ── */
crawlerJobSchema.index({ status: 1, created_at: -1 });
crawlerJobSchema.index({ source_id: 1 });

module.exports = mongoose.model('CrawlerJob', crawlerJobSchema);
