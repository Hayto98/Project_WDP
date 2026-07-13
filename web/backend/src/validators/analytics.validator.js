const Joi = require('joi');

const currentYear = new Date().getFullYear();

const gapsQuerySchema = Joi.object({
  densityThreshold: Joi.number().min(0.1).max(1).default(0.35),
});

const liveGapSource = Joi.string().valid('OpenAlex', 'Crossref', 'arXiv', 'Semantic Scholar', 'Exa');

const liveGapSchema = Joi.object({
  topic: Joi.string().trim().min(2).max(300).required(),
  sources: Joi.array().items(liveGapSource).min(1).max(5).default(['OpenAlex', 'Crossref', 'arXiv']),
  yearFrom: Joi.number().integer().min(1900).max(2030).default(2021),
  yearTo: Joi.number().integer().min(1900).max(2030).default(currentYear),
  maxRecordsPerSource: Joi.number().integer().min(10).max(100).default(50),
  topK: Joi.number().integer().min(3).max(30).default(12),
}).custom((value, helpers) => {
  if (value.yearFrom > value.yearTo) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': '"yearFrom" must be less than or equal to "yearTo"',
});

const saveLiveGapSchema = Joi.object({
  result: Joi.object().required(),
});

module.exports = { gapsQuerySchema, liveGapSchema, saveLiveGapSchema };
