/**
 * Unique View deduplication using Redis (BR-043).
 *
 * Flow:
 *   User opens paper detail
 *   → EXISTS view:{user_id}:{paper_id}?
 *       Yes → skip (don't count again)
 *       No  → SET key TTL 1800s
 *            → INSERT paper_views record in MongoDB
 *            → (async) invalidate top_papers:30d cache
 */

const redis = require('../config/redis');

const VIEW_TTL_SECONDS = 1800; // 30 minutes

/**
 * Check if this view should be counted (not a duplicate within 30 min).
 * If Redis is unavailable, always allow (fallback to always-count).
 *
 * @param {string} userId
 * @param {string} paperId
 * @returns {Promise<boolean>} true if this is a new unique view
 */
async function shouldCountView(userId, paperId) {
  if (!redis) return true;

  const key = `view:${userId}:${paperId}`;
  try {
    const exists = await redis.exists(key);
    if (exists) return false;

    await redis.set(key, '1', 'EX', VIEW_TTL_SECONDS);
    return true;
  } catch (err) {
    console.warn('⚠️  Redis dedup error, allowing view:', err.message);
    return true;
  }
}

/**
 * Invalidate the top-papers cache after a new view is recorded.
 */
async function invalidateTopPapersCache() {
  if (!redis) return;

  try {
    await redis.del('top_papers:30d');
  } catch (err) {
    console.warn('⚠️  Redis invalidate error:', err.message);
  }
}

module.exports = { shouldCountView, invalidateTopPapersCache };
