/**
 * Wrapper quanh global fetch() — tự động console.log mọi request ra API bên thứ 3.
 * Import: const { loggedFetch } = require('../utils/loggedFetch');
 * Dùng:   loggedFetch(url, options)   thay cho   fetch(url, options)
 */

const LOG_PREFIX = '[3rd-Party API]';

async function loggedFetch(url, options = {}) {
  const urlStr = typeof url === 'string' ? url : url.toString();
  const method = (options.method || 'GET').toUpperCase();
  const start = Date.now();

  console.log(`${LOG_PREFIX} ➡️  ${method} ${urlStr}`);

  try {
    const res = await fetch(url, options);
    const elapsed = Date.now() - start;
    console.log(
      `${LOG_PREFIX} ✅  ${method} ${urlStr} → ${res.status} ${res.statusText} (${elapsed}ms)`,
    );
    return res;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(
      `${LOG_PREFIX} ❌  ${method} ${urlStr} → ERROR: ${err.message} (${elapsed}ms)`,
    );
    throw err;
  }
}

module.exports = { loggedFetch };
