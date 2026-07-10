const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateUserSchema, createJobSchema, updateDataSourceSchema } = require('../validators/admin.validator');

const router = Router();
router.use(authenticate);
router.use(rbac('Admin'));

// Users
router.get('/users', ctrl.getUsers);
router.put('/users/:id', validate(updateUserSchema), ctrl.updateUser);

// Data Sources
router.get('/data-sources', ctrl.getDataSources);
router.post('/data-sources/check', ctrl.checkDataSourceApis);
router.put('/data-sources/:id', validate(updateDataSourceSchema), ctrl.updateDataSource);

// Crawler Jobs
router.get('/jobs', ctrl.getJobs);
router.post('/jobs', validate(createJobSchema), ctrl.createJob);
router.post('/jobs/:id/run', ctrl.runJob);

// Analysis Reports
router.post('/reports/refresh', ctrl.refreshReports);

// Audit Logs
router.get('/audit-logs', ctrl.getAuditLogs);

// Paper Read Logs
router.get('/paper-reads', ctrl.getPaperReads);

// Stats
router.get('/stats', ctrl.getStats);

module.exports = router;
