const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateProfileSchema, updateDashboardLayoutSchema } = require('../validators/user.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and settings endpoints
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/me', validate(updateProfileSchema), ctrl.updateProfile);

/**
 * @swagger
 * /api/v1/users/me/dashboard-layout:
 *   put:
 *     summary: Update dashboard layout preferences
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Layout updated successfully
 */
router.put('/me/dashboard-layout', validate(updateDashboardLayoutSchema), ctrl.updateDashboardLayout);

module.exports = router;
