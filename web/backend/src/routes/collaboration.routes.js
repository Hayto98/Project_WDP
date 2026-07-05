const { Router } = require('express');
const ctrl = require('../controllers/collaboration.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/researchers', ctrl.getResearchers);
router.get('/invites', ctrl.getInvites);
router.post('/invites', ctrl.createInvite);
router.put('/invites/:id', ctrl.respondToInvite);

module.exports = router;
