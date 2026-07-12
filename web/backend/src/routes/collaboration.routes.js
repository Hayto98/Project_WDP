const { Router } = require('express');
const ctrl = require('../controllers/collaboration.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createInviteSchema, respondInviteSchema } = require('../validators/collaboration.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Collaboration
 *   description: Researcher collaboration and invites
 */

/**
 * @swagger
 * /api/v1/collaboration/researchers:
 *   get:
 *     summary: Find researchers to collaborate with
 *     tags: [Collaboration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of researchers
 */
router.get('/researchers', ctrl.getResearchers);

/**
 * @swagger
 * /api/v1/collaboration/invites:
 *   get:
 *     summary: Get pending invites
 *     tags: [Collaboration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of invites
 */
router.get('/invites', ctrl.getInvites);

/**
 * @swagger
 * /api/v1/collaboration/invites:
 *   post:
 *     summary: Send an invite
 *     tags: [Collaboration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Invite sent
 */
router.post('/invites', validate(createInviteSchema), ctrl.createInvite);

/**
 * @swagger
 * /api/v1/collaboration/invites/{id}:
 *   put:
 *     summary: Respond to an invite
 *     tags: [Collaboration]
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
 *         description: Invite response processed
 */
router.put('/invites/:id', validate(respondInviteSchema), ctrl.respondToInvite);

/**
 * @swagger
 * /api/v1/collaboration/invites/{id}:
 *   delete:
 *     summary: Delete/cancel a sent invite
 *     tags: [Collaboration]
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
 *         description: Invite deleted
 */
router.delete('/invites/:id', ctrl.deleteInvite);

module.exports = router;
