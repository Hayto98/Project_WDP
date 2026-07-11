const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Sub-schemas (Embedded) ── */

const savedSearchSchema = new Schema(
  {
    search_id: { type: String, default: () => new mongoose.Types.UUID().toString() },
    name: { type: String, required: true, trim: true },
    criteria: {
      keywords: [String],
      year_gte: Number,
      year_lte: Number,
      authors: [String],
      research_fields: [String],
      source_names: [String],
      logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const followRuleSchema = new Schema(
  {
    frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
    threshold: { type: String, enum: ['all', 'highCitation', 'trustedSources'], default: 'all' },
    email: { type: Boolean, default: false },
    in_app: { type: Boolean, default: true },
    exclude: [String],
  },
  { _id: false },
);

const followedSubjectSchema = new Schema(
  {
    follow_id: { type: String, default: () => new mongoose.Types.UUID().toString() },
    type: { type: String, enum: ['Keyword', 'Field', 'Author'], required: true },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    rule: { type: followRuleSchema, default: () => ({}) },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const dashboardLayoutSchema = new Schema(
  {
    widgets: {
      type: [String],
      default: ['trend_chart', 'research_gap_heatmap', 'top_papers', 'ai_insights'],
    },
  },
  { _id: false },
);

/* ── Main Schema ── */

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Banned'],
      default: 'Active',
    },

    // Embedded arrays
    roles: {
      type: [String],
      enum: ['Student', 'Admin'],
      default: ['Student'],
    },
    saved_searches: [savedSearchSchema],
    followed_subjects: [followedSubjectSchema],
    dashboard_layout: { type: dashboardLayoutSchema, default: () => ({}) },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

module.exports = mongoose.model('User', userSchema);
