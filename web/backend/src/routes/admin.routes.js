const { Router } = require('express');
const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateUserSchema, createJobSchema, updateDataSourceSchema } = require('../validators/admin.validator');

const router = Router();
router.use(authenticate);
router.use(rbac('Admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations
 */

// Users

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', ctrl.getUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/users/:id', validate(updateUserSchema), ctrl.updateUser);

// Data Sources

/**
 * @swagger
 * /api/v1/admin/data-sources:
 *   get:
 *     summary: Get data sources
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of data sources
 */
router.get('/data-sources', ctrl.getDataSources);

/**
 * @swagger
 * /api/v1/admin/data-sources/check:
 *   post:
 *     summary: Check data source APIs
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: APIs checked
 */
router.post('/data-sources/check', ctrl.checkDataSourceApis);

/**
 * @swagger
 * /api/v1/admin/data-sources/{id}:
 *   put:
 *     summary: Update data source
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data source updated
 */
router.put('/data-sources/:id', validate(updateDataSourceSchema), ctrl.updateDataSource);

// Crawler Jobs

/**
 * @swagger
 * /api/v1/admin/jobs:
 *   get:
 *     summary: Get crawler jobs
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get('/jobs', ctrl.getJobs);

/**
 * @swagger
 * /api/v1/admin/jobs:
 *   post:
 *     summary: Create crawler job
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Job created
 */
router.post('/jobs', validate(createJobSchema), ctrl.createJob);

/**
 * @swagger
 * /api/v1/admin/jobs/{id}/run:
 *   post:
 *     summary: Run a crawler job
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job started
 */
router.post('/jobs/:id/run', ctrl.runJob);

// Analysis Reports

/**
 * @swagger
 * /api/v1/admin/reports/refresh:
 *   post:
 *     summary: Refresh analysis reports
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reports refreshed
 */
router.post('/reports/refresh', ctrl.refreshReports);

// Audit Logs

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get('/audit-logs', ctrl.getAuditLogs);

// Paper Read Logs

/**
 * @swagger
 * /api/v1/admin/paper-reads:
 *   get:
 *     summary: Get paper read logs
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paper reads
 */
router.get('/paper-reads', ctrl.getPaperReads);

// Stats

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get system stats
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System stats
 */
router.get('/stats', ctrl.getStats);

module.exports = router;
