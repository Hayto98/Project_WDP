const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow('').default(''),
  active: Joi.boolean().optional(),
  owner_name: Joi.string().trim().max(100).optional(),
  owner_initials: Joi.string().trim().min(1).max(2).optional(),
});

const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  active: Joi.boolean().optional(),
}).min(1);

const createItemSchema = Joi.object({
  kind: Joi.string().valid('task', 'note', 'discussion').required(),
  title: Joi.string().trim().min(1).max(300).required(),
  status: Joi.string().valid('backlog', 'doing', 'done').default('backlog'),
  assignee_id: objectId.optional().allow(null, ''),
  paper_id: objectId.optional().allow(null, ''),
  due: Joi.string().max(20).allow('').default(''),
  note: Joi.string().max(2000).allow('').default(''),
});

const updateItemSchema = Joi.object({
  kind: Joi.string().valid('task', 'note', 'discussion').optional(),
  title: Joi.string().trim().min(1).max(300).optional(),
  status: Joi.string().valid('backlog', 'doing', 'done').optional(),
  assignee_id: objectId.optional().allow(null, ''),
  paper_id: objectId.optional().allow(null, ''),
  due: Joi.string().max(20).allow('').optional(),
  note: Joi.string().max(2000).allow('').optional(),
}).min(1);

const addMemberSchema = Joi.object({
  user_id: objectId.required(),
  name: Joi.string().trim().min(1).max(100).required(),
  initials: Joi.string().trim().min(1).max(2).required(),
  role: Joi.string().valid('editor', 'viewer').default('viewer'),
});

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('editor', 'viewer').required(),
});

const addCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  author_name: Joi.string().trim().max(100).allow('').optional(),
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createItemSchema,
  updateItemSchema,
  addMemberSchema,
  updateMemberSchema,
  addCommentSchema,
};
