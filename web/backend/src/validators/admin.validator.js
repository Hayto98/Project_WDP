const Joi = require('joi');

const sourceName = Joi.string().valid('OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore', 'ACM Digital Library', 'Exa');

const updateUserSchema = Joi.object({
  status: Joi.string().valid('Active', 'Inactive', 'Banned').optional(),
  roles: Joi.array().items(Joi.string().valid('Student', 'Admin')).min(1).max(2).optional(),
}).min(1);

const createJobSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  source_id: Joi.string().hex().length(24).optional(),
  source_name: sourceName.required(),
  query: Joi.string().trim().min(1).max(500).required(),
  max_records: Joi.number().integer().min(1).max(50).default(25),
});

const updateDataSourceSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  sync_schedule: Joi.string().max(50).allow('').optional(),
  api_endpoint: Joi.string().uri().allow('').optional(),
}).min(1);

const broadcastNotificationSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).max(2000).required(),
  priority: Joi.string().valid('high', 'normal', 'low').default('high'),
});

const createUserSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required(),
  roles: Joi.array().items(Joi.string().valid('Student', 'Admin')).min(1).max(2).required(),
  status: Joi.string().valid('Active', 'Inactive', 'Banned').default('Active'),
});

module.exports = {
  updateUserSchema,
  createUserSchema,
  createJobSchema,
  updateDataSourceSchema,
  broadcastNotificationSchema,
};
