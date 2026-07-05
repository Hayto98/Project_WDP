const mongoose = require('mongoose');
const { Schema } = mongoose;

const analysisReportSchema = new Schema(
  {
    report_type: {
      type: String,
      enum: ['TrendSummary', 'ResearchGap', 'TopPapers', 'GrowthTable', 'Cooccurrence', 'CustomSearch'],
      required: true,
    },
    criteria: { type: Schema.Types.Mixed, default: {} },
    result_snapshot: { type: Schema.Types.Mixed, default: {} },
    generated_at: { type: Date, default: Date.now },
    expires_at: Date,
  },
  {
    timestamps: false,
    collection: 'analysis_reports',
  },
);

/* ── Indexes ── */
analysisReportSchema.index({ report_type: 1, generated_at: -1 });
analysisReportSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL

module.exports = mongoose.model('AnalysisReport', analysisReportSchema);
