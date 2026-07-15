/**
 * Stable slug for trend / co-occurrence keys (shared across analytics + reports).
 */
function slugify(value) {
  return String(value || 'other')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'other';
}

module.exports = { slugify };
