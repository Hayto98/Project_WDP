const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── Sub-schemas ── */

const authorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    is_primary: { type: Boolean, default: false },
  },
  { _id: false },
);

const sourceRefSchema = new Schema(
  {
    source_name: {
      type: String,
      enum: ['OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'Exa'],
      required: true,
    },
    external_id: { type: String, required: true },
    fetched_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/* ── Main Schema ── */

const paperSchema = new Schema(
  {
    doi: { type: String, sparse: true, trim: true },
    title: { type: String, required: true, trim: true },
    title_normalized: { type: String, trim: true },
    abstract: { type: String, default: '' },
    publication_year: { type: Number, required: true },
    publication_month: { type: Number, min: 1, max: 12 },
    source_name: { type: String, trim: true },
    original_url: { type: String, trim: true },
    citation_count: { type: Number, default: 0 },
    citation_updated_at: Date,
    type: {
      type: String,
      enum: ['Journal', 'Conference', 'Preprint'],
      default: 'Preprint',
    },
    status: {
      type: String,
      enum: ['Raw', 'Cleaned', 'Rejected', 'Archived'],
      default: 'Raw',
    },

    // Embedded arrays
    authors: [authorSchema],
    keywords: [String],
    research_fields: [String],
    sources: [sourceRefSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

/* ── Indexes ── */
paperSchema.index({ doi: 1 }, { unique: true, sparse: true });
paperSchema.index({ title_normalized: 1, publication_year: 1 });
paperSchema.index({ status: 1, publication_year: -1 });
paperSchema.index({ citation_count: -1 }, { sparse: true });
paperSchema.index({ publication_year: -1 });
paperSchema.index({ source_name: 1, type: 1, publication_year: -1 });
paperSchema.index({ research_fields: 1 });
paperSchema.index({ keywords: 1 });
paperSchema.index(
  { title: 'text', abstract: 'text', keywords: 'text' },
  { weights: { title: 10, keywords: 5, abstract: 1 }, name: 'paper_text_search' },
);

/* ── Pre-save hook: generate title_normalized for dedup ── */
paperSchema.pre('save', function () {
  if (this.isModified('title')) {
    this.title_normalized = this.title.toLowerCase().trim();
  }
});

module.exports = mongoose.model('Paper', paperSchema);
