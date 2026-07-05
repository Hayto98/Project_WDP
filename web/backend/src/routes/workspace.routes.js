const { Router } = require('express');
const ctrl = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

// Workspaces
router.get('/', ctrl.getWorkspaces);
router.post('/', ctrl.createWorkspace);
router.get('/:id', ctrl.getWorkspaceById);
router.put('/:id', ctrl.updateWorkspace);
router.delete('/:id', ctrl.deleteWorkspace);

// Members
router.post('/:id/members', ctrl.addMember);
router.put('/:id/members/:memberId', ctrl.updateMember);
router.delete('/:id/members/:memberId', ctrl.removeMember);

// Work Items
router.get('/:id/items', ctrl.getItems);
router.post('/:id/items', ctrl.createItem);
router.put('/:id/items/:itemId', ctrl.updateItem);
router.delete('/:id/items/:itemId', ctrl.deleteItem);
router.post('/:id/items/:itemId/comments', ctrl.addComment);

// Activities
router.get('/:id/activities', ctrl.getActivities);

module.exports = router;
