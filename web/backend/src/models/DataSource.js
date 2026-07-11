const mongoose = require('mongoose');
const { Schema } = mongoose;

const dataSourceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'ACM Digital Library', 'Exa'],
    },
    api_endpoint: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    sync_schedule: { type: String, default: '0 2 * * *' }, // Cron expression (BR-004)
    last_sync_at: Date,
    last_sync_status: {
      type: String,
      enum: ['Success', 'Failed', 'Partial', 'Running'],
    },
    last_error: { type: String, default: null },
    papers_synced_count: { type: Number, default: 0 },
    // Admin dashboard display fields (from adminSample.ts DataSource)
    coverage: { type: String, default: '0%' },
    latency: { type: String, default: '—' },
    error_rate: { type: String, default: '0%' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

/* ── Indexes ── */
dataSourceSchema.index({ enabled: 1, last_sync_status: 1 });

module.exports = mongoose.model('DataSource', dataSourceSchema);
