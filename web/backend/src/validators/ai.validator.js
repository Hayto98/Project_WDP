const Joi = require('joi');

const summarizeSchema = Joi.object({
  title: Joi.string().trim().max(500).required(),
  abstract: Joi.string().max(5000).allow('').optional(),
  year: Joi.number().integer().min(1000).max(2030).optional(),
  source: Joi.string().max(100).allow('').optional(),
  keywords: Joi.array().items(Joi.string().max(100)).max(20).optional(),
});

const explainTermSchema = Joi.object({
  term: Joi.string().trim().min(1).max(200).required(),
  context: Joi.string().max(1500).allow('').optional(),
});

const suggestDirectionsSchema = Joi.object({
  field: Joi.string().max(200).allow('').optional(),
  gaps: Joi.array().items(Joi.object().unknown(true)).max(20).optional(),
});

const relatedPapersSchema = Joi.object({
  paperId: Joi.string().hex().length(24).optional(),
  title: Joi.string().trim().max(500).allow('').optional(),
  keywords: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  fields: Joi.array().items(Joi.string().max(120)).max(20).optional(),
  limit: Joi.number().integer().min(1).max(10).default(5),
}).or('paperId', 'title', 'keywords', 'fields');

module.exports = {
  summarizeSchema,
  explainTermSchema,
  suggestDirectionsSchema,
  relatedPapersSchema,
};
