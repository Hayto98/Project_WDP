const { Router } = require('express');
const ctrl = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createItemSchema,
  updateItemSchema,
  addMemberSchema,
  updateMemberSchema,
  addCommentSchema,
} = require('../validators/workspace.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace management
 */

// Workspaces

/**
 * @swagger
 * /api/v1/workspaces:
 *   get:
 *     summary: Get user workspaces
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/', ctrl.getWorkspaces);

/**
 * @swagger
 * /api/v1/workspaces:
 *   post:
 *     summary: Create a workspace
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Workspace created
 */
router.post('/', validate(createWorkspaceSchema), ctrl.createWorkspace);

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   get:
 *     summary: Get workspace details
 *     tags: [Workspaces]
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
 *         description: Workspace details
 */
router.get('/:id', ctrl.getWorkspaceById);

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   put:
 *     summary: Update workspace
 *     tags: [Workspaces]
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
 *         description: Workspace updated
 */
router.put('/:id', validate(updateWorkspaceSchema), ctrl.updateWorkspace);

/**
 * @swagger
 * /api/v1/workspaces/{id}:
 *   delete:
 *     summary: Delete workspace
 *     tags: [Workspaces]
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
 *         description: Workspace deleted
 */
router.delete('/:id', ctrl.deleteWorkspace);

// Members
router.post('/:id/members', validate(addMemberSchema), ctrl.addMember);
router.put('/:id/members/:memberId', validate(updateMemberSchema), ctrl.updateMember);
router.delete('/:id/members/:memberId', ctrl.removeMember);

// Work Items
router.get('/:id/items', ctrl.getItems);
router.post('/:id/items', validate(createItemSchema), ctrl.createItem);
router.put('/:id/items/:itemId', validate(updateItemSchema), ctrl.updateItem);
router.delete('/:id/items/:itemId', ctrl.deleteItem);
router.post('/:id/items/:itemId/comments', validate(addCommentSchema), ctrl.addComment);

// Activities
router.get('/:id/activities', ctrl.getActivities);

module.exports = router;
