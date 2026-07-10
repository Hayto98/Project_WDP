const { Router } = require('express');
const ctrl = require('../controllers/collaboration.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createInviteSchema, respondInviteSchema } = require('../validators/collaboration.validator');

const router = Router();
router.use(authenticate);

router.get('/researchers', ctrl.getResearchers);
router.get('/invites', ctrl.getInvites);
router.post('/invites', validate(createInviteSchema), ctrl.createInvite);
router.put('/invites/:id', validate(respondInviteSchema), ctrl.respondToInvite);

module.exports = router;
