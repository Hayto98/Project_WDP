const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * SystemLog — Time Series Collection (BR-041, FR-012).
 *
 * NOTE: For Mongoose, we define it as a normal schema.
 * The actual Time Series config is applied via createCollection()
 * in the database setup or migration script:
 *
 *   db.createCollection("system_logs", {
 *     timeseries: {
 *       timeField: "timestamp",
 *       metaField: "meta",
 *       granularity: "minutes"
 *     }
 *   })
 */

const systemLogSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now, required: true },
    meta: {
      action_type: {
        type: String,
        enum: ['Search', 'Login', 'ApiError', 'BatchJob', 'SystemError'],
        required: true,
      },
      user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      source_name: { type: String, default: null },
    },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false,
    collection: 'system_logs',
  },
);

module.exports = mongoose.model('SystemLog', systemLogSchema);
