const Joi = require('joi');

const createFeedbackSchema = Joi.object({
  content: Joi.string().trim().min(5).max(2000).required(),
});

const updateFeedbackSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Reviewed', 'Resolved').optional(),
  admin_note: Joi.string().trim().max(1000).allow(null, '').optional(),
}).min(1);

module.exports = {
  createFeedbackSchema,
  updateFeedbackSchema,
};
