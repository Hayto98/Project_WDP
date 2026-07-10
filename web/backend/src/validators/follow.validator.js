const Joi = require('joi');

const followRuleSchema = Joi.object({
  frequency: Joi.string().valid('instant', 'daily', 'weekly').default('daily'),
  threshold: Joi.string().valid('all', 'highCitation', 'trustedSources').default('all'),
  email: Joi.boolean().default(false),
  in_app: Joi.boolean().default(true),
  exclude: Joi.array().items(Joi.string().max(200)).max(20).default([]),
});

const followRuleUpdateSchema = Joi.object({
  frequency: Joi.string().valid('instant', 'daily', 'weekly').optional(),
  threshold: Joi.string().valid('all', 'highCitation', 'trustedSources').optional(),
  email: Joi.boolean().optional(),
  in_app: Joi.boolean().optional(),
  exclude: Joi.array().items(Joi.string().max(200)).max(20).optional(),
}).min(1);

const addSubjectSchema = Joi.object({
  type: Joi.string().valid('Keyword', 'Field', 'Author').required(),
  value: Joi.string().trim().min(1).max(200).required(),
  rule: followRuleSchema.default({}),
});

const updateSubjectSchema = Joi.object({
  active: Joi.boolean().optional(),
  rule: followRuleUpdateSchema.optional(),
}).min(1);

module.exports = { addSubjectSchema, updateSubjectSchema };
