const SystemLog = require('../models/SystemLog');

async function logAction(actionType, userId = null, sourceName = null, details = {}) {
  try {
    await SystemLog.create({
      timestamp: new Date(),
      meta: {
        action_type: actionType,
        user_id: userId,
        source_name: sourceName,
      },
      details,
    });
  } catch (err) {
    console.warn('⚠️  SystemLog write failed:', err.message);
  }
}

module.exports = { logAction };
