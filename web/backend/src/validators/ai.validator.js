const Joi = require('joi');

const summarizeSchema = Joi.object({
  abstract: Joi.string().max(5000).optional().allow(''),
  title: Joi.string().max(500).required(),
});

const explainTermSchema = Joi.object({
  term: Joi.string().trim().min(1).max(200).required(),
});

const suggestDirectionsSchema = Joi.object({
  field: Joi.string().max(200).optional().allow(''),
  gaps: Joi.array().items(Joi.object()).optional(),
});

module.exports = { summarizeSchema, explainTermSchema, suggestDirectionsSchema };
