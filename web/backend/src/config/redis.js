const Redis = require('ioredis');
const { redisUrl } = require('./env');

let redis = null;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️  Redis: max retries reached, running without cache');
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.warn('⚠️  Redis error:', err.message));
} catch (err) {
  console.warn('⚠️  Redis unavailable, running without cache');
}

module.exports = redis;
