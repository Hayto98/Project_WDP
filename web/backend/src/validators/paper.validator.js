const Joi = require('joi');

const syncRequestSchema = Joi.object({
  query: Joi.string().trim().min(1).max(500).required(),
  sourceName: Joi.string().valid('OpenAlex', 'arXiv', 'Crossref').default('OpenAlex'),
  maxRecords: Joi.number().integer().min(1).max(50).default(25),
  yearFrom: Joi.number().integer().min(1900).max(2030).optional(),
  yearTo: Joi.number().integer().min(1900).max(2030).optional(),
  types: Joi.string().optional().allow(''),
});

module.exports = { syncRequestSchema };
