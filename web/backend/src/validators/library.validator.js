const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createCollectionSchema = Joi.object({
  collection_name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).default(''),
});

const updateCollectionSchema = Joi.object({
  collection_name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional(),
}).min(1);

const savePaperSchema = Joi.object({
  paper_id: objectId.required(),
  collection_ids: Joi.array().items(objectId).min(1).max(20).required(),
  note: Joi.string().max(2000).optional().allow(''),
});

const updateSavedPaperSchema = Joi.object({
  status: Joi.string().valid('unread', 'reading', 'done').optional(),
  note: Joi.string().max(2000).optional().allow(''),
}).min(1);

module.exports = {
  createCollectionSchema,
  updateCollectionSchema,
  savePaperSchema,
  updateSavedPaperSchema,
};
