const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');

const router = Router();
router.use(authenticate);
router.use(rbac('Admin'));

// Users
router.get('/users', ctrl.getUsers);
router.put('/users/:id', ctrl.updateUser);

// Data Sources
router.get('/data-sources', ctrl.getDataSources);
router.put('/data-sources/:id', ctrl.updateDataSource);

// Crawler Jobs
router.get('/jobs', ctrl.getJobs);
router.post('/jobs', ctrl.createJob);

// Audit Logs
router.get('/audit-logs', ctrl.getAuditLogs);

// Paper Read Logs
router.get('/paper-reads', ctrl.getPaperReads);

// Stats
router.get('/stats', ctrl.getStats);

module.exports = router;
