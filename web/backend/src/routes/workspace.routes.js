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

// Workspaces
router.get('/', ctrl.getWorkspaces);
router.post('/', validate(createWorkspaceSchema), ctrl.createWorkspace);
router.get('/:id', ctrl.getWorkspaceById);
router.put('/:id', validate(updateWorkspaceSchema), ctrl.updateWorkspace);
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
