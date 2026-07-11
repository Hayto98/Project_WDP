const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/database');
const { port, corsOrigin, nodeEnv, redisEnabled } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { logAction } = require('./utils/systemLogger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const paperRoutes = require('./routes/paper.routes');
const libraryRoutes = require('./routes/library.routes');
const followRoutes = require('./routes/follow.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const searchRoutes = require('./routes/search.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const collaborationRoutes = require('./routes/collaboration.routes');
const adminRoutes = require('./routes/admin.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const { startScheduler } = require('./services/scheduler.service');

const app = express();

/* ── Global Middleware ── */
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (nodeEnv !== 'test') {
  app.use(morgan('dev'));
}
app.use('/api', apiLimiter);

/* ── API Routes ── */
const v1 = '/api/v1';

app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/papers`, paperRoutes);
app.use(`${v1}/library`, libraryRoutes);
app.use(`${v1}/follow`, followRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/dashboard`, dashboardRoutes);
app.use(`${v1}/analytics`, analyticsRoutes);
app.use(`${v1}/ai`, aiRoutes);
app.use(`${v1}/searches`, searchRoutes);
app.use(`${v1}/workspaces`, workspaceRoutes);
app.use(`${v1}/collaboration`, collaborationRoutes);
app.use(`${v1}/admin`, adminRoutes);
app.use(`${v1}/feedbacks`, feedbackRoutes);

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ── Health Check ── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── 404 Handler ── */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

/* ── Global Error Handler ── */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  logAction('SystemError', null, null, {
    message: err.message,
    stack: nodeEnv === 'production' ? undefined : err.stack,
    statusCode: err.statusCode || 500,
  });
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: nodeEnv === 'production' ? 'Internal server error' : err.message,
    },
  });
});

/* ── Start Server ── */
async function start() {
  await connectDB();

  if (redisEnabled) {
    try {
      const redis = require('./config/redis');
      if (redis) await redis.connect();
    } catch {
      console.warn('⚠️  Redis not available, running without cache');
    }
  }

  const server = app.listen(port, () => {
    console.log(`🚀 WDP Backend running on port ${port} [${nodeEnv}]`);
    console.log(`   Health: http://localhost:${port}/api/health`);
    console.log(`   API:    http://localhost:${port}/api/v1`);
    if (nodeEnv !== 'test') {
      const scheduler = startScheduler();
      if (scheduler.started) {
        console.log(`   Scheduler: crawler ${Math.round(scheduler.queueMs / 60000)}m, reports ${Math.round(scheduler.reportMs / 60000)}m`);
      }
    }
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
