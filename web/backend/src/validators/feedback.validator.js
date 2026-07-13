const Joi = require('joi');

const createFeedbackSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
});

const updateFeedbackSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Reviewed', 'Resolved').optional(),
  admin_note: Joi.string().trim().max(1000).allow(null, '').optional(),
}).min(1);

const replyFeedbackSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  status: Joi.string().valid('Pending', 'Reviewed', 'Resolved').optional(),
});

module.exports = {
  createFeedbackSchema,
  updateFeedbackSchema,
  replyFeedbackSchema,
};
