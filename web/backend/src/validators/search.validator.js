const Joi = require('joi');

const createSavedSearchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  criteria: Joi.object({
    keywords: Joi.array().items(Joi.string().max(200)).max(20).optional(),
    year_gte: Joi.number().integer().optional(),
    year_lte: Joi.number().integer().optional(),
    authors: Joi.array().items(Joi.string().max(200)).max(20).optional(),
    research_fields: Joi.array().items(Joi.string().max(200)).max(20).optional(),
    source_names: Joi.array().items(Joi.string().max(100)).max(10).optional(),
    logic: Joi.string().valid('AND', 'OR').default('AND'),
  }).required(),
});

module.exports = { createSavedSearchSchema };
