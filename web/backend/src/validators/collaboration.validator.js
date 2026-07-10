const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createInviteSchema = Joi.object({
  workspace_id: objectId.required(),
  invitee_email: Joi.string().email().required(),
  invitee_name: Joi.string().trim().max(100).allow('').default(''),
  invitee_user_id: objectId.optional().allow(null, ''),
  direction: Joi.string().valid('incoming', 'outgoing').default('outgoing'),
  topic: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().max(1000).allow('').default(''),
});

const respondInviteSchema = Joi.object({
  status: Joi.string().valid('accepted', 'declined').required(),
});

module.exports = {
  createInviteSchema,
  respondInviteSchema,
};
