const Joi = require('joi');

const sourceName = Joi.string().valid('OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'ACM Digital Library', 'Exa');

const syncRequestSchema = Joi.object({
  query: Joi.string().trim().min(1).max(500).required(),
  sourceName: sourceName.default('OpenAlex'),
  maxRecords: Joi.number().integer().min(1).max(50).default(25),
  yearFrom: Joi.number().integer().min(1900).max(2030).optional(),
  yearTo: Joi.number().integer().min(1900).max(2030).optional(),
  types: Joi.string().max(200).optional(),
});

module.exports = { syncRequestSchema };
