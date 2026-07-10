const Joi = require('joi');

const ruleSchema = Joi.object({
  frequency: Joi.string().valid('instant', 'daily', 'weekly').default('daily'),
  threshold: Joi.string().valid('all', 'highCitation', 'trustedSources').default('all'),
  email: Joi.boolean().default(false),
  in_app: Joi.boolean().default(true),
  exclude: Joi.array().items(Joi.string().max(200)).max(20).default([]),
});

const addSubjectSchema = Joi.object({
  type: Joi.string().valid('Keyword', 'Field', 'Author').required(),
  value: Joi.string().trim().min(1).max(200).required(),
  rule: ruleSchema.default({}),
});

const updateSubjectSchema = Joi.object({
  active: Joi.boolean().optional(),
  rule: ruleSchema.fork(['frequency', 'threshold', 'email', 'in_app', 'exclude'], (schema) => schema.optional()).optional(),
}).min(1);

module.exports = {
  addSubjectSchema,
  updateSubjectSchema,
};
