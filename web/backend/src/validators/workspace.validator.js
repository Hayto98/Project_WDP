const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Vui lòng nhập tên workspace.',
    'string.min': 'Tên workspace không được để trống.',
    'string.max': 'Tên workspace không được dài quá 100 ký tự.',
    'any.required': 'Tên workspace là bắt buộc.',
  }),
  description: Joi.string().trim().max(500).allow('').default('').messages({
    'string.max': 'Mô tả không được dài quá 500 ký tự.',
  }),
  active: Joi.boolean().optional(),
  owner_name: Joi.string().trim().max(100).optional(),
  owner_initials: Joi.string().trim().min(1).max(2).optional(),
});

const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional().messages({
    'string.empty': 'Vui lòng nhập tên workspace.',
    'string.min': 'Tên workspace không được để trống.',
    'string.max': 'Tên workspace không được dài quá 100 ký tự.',
  }),
  description: Joi.string().trim().max(500).allow('').optional().messages({
    'string.max': 'Mô tả không được dài quá 500 ký tự.',
  }),
  active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Vui lòng cung cấp ít nhất một trường để cập nhật.',
});

const createItemSchema = Joi.object({
  kind: Joi.string().valid('task', 'note', 'discussion').required().messages({
    'any.only': 'Loại item không hợp lệ.',
    'any.required': 'Vui lòng chọn loại item.',
  }),
  title: Joi.string().trim().min(1).max(300).required().messages({
    'string.empty': 'Vui lòng nhập tiêu đề cho item.',
    'string.min': 'Tiêu đề không được để trống.',
    'string.max': 'Tiêu đề không được dài quá 300 ký tự.',
    'any.required': 'Tiêu đề là bắt buộc.',
  }),
  status: Joi.string().valid('backlog', 'doing', 'done').default('backlog').messages({
    'any.only': 'Trạng thái không hợp lệ.',
  }),
  assignee_id: objectId.optional().allow(null, ''),
  assignee_ids: Joi.array().items(objectId).optional().messages({
    'array.includes': 'ID người phụ trách không hợp lệ.',
  }),
  paper_id: objectId.optional().allow(null, ''),
  due: Joi.string().max(20).allow('').default('').messages({
    'string.max': 'Deadline không được dài quá 20 ký tự.',
  }),
  note: Joi.string().max(2000).allow('').default('').messages({
    'string.max': 'Mô tả không được dài quá 2000 ký tự.',
  }),
});

const updateItemSchema = Joi.object({
  kind: Joi.string().valid('task', 'note', 'discussion').optional().messages({
    'any.only': 'Loại item không hợp lệ.',
  }),
  title: Joi.string().trim().min(1).max(300).optional().messages({
    'string.empty': 'Vui lòng nhập tiêu đề cho item.',
    'string.min': 'Tiêu đề không được để trống.',
    'string.max': 'Tiêu đề không được dài quá 300 ký tự.',
  }),
  status: Joi.string().valid('backlog', 'doing', 'done').optional().messages({
    'any.only': 'Trạng thái không hợp lệ.',
  }),
  assignee_id: objectId.optional().allow(null, ''),
  assignee_ids: Joi.array().items(objectId).optional().messages({
    'array.includes': 'ID người phụ trách không hợp lệ.',
  }),
  paper_id: objectId.optional().allow(null, ''),
  due: Joi.string().max(20).allow('').optional().messages({
    'string.max': 'Deadline không được dài quá 20 ký tự.',
  }),
  note: Joi.string().max(2000).allow('').optional().messages({
    'string.max': 'Mô tả không được dài quá 2000 ký tự.',
  }),
}).min(1).messages({
  'object.min': 'Vui lòng cung cấp ít nhất một trường để cập nhật.',
});

const addMemberSchema = Joi.object({
  user_id: objectId.required().messages({
    'any.required': 'Vui lòng cung cấp ID người dùng.',
  }),
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Tên không được để trống.',
    'string.max': 'Tên không được dài quá 100 ký tự.',
    'any.required': 'Tên là bắt buộc.',
  }),
  initials: Joi.string().trim().min(1).max(2).required().messages({
    'string.empty': 'Tên viết tắt không được để trống.',
    'string.max': 'T Tên viết tắt không được dài quá 2 ký tự.',
    'any.required': 'Tên viết tắt là bắt buộc.',
  }),
  role: Joi.string().valid('editor', 'viewer').default('viewer').messages({
    'any.only': 'Quyền không hợp lệ.',
  }),
});

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('editor', 'viewer').required().messages({
    'any.only': 'Quyền không hợp lệ.',
    'any.required': 'Vui lòng chọn quyền.',
  }),
});

const addCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Nội dung bình luận không được để trống.',
    'string.min': 'Nội dung bình luận không được để trống.',
    'string.max': 'Bình luận không được dài quá 2000 ký tự.',
    'any.required': 'Vui lòng nhập nội dung bình luận.',
  }),
  author_name: Joi.string().trim().max(100).allow('').optional(),
});

const editCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Nội dung bình luận không được để trống.',
    'string.min': 'Nội dung bình luận không được để trống.',
    'string.max': 'Bình luận không được dài quá 2000 ký tự.',
    'any.required': 'Vui lòng nhập nội dung bình luận.',
  }),
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createItemSchema,
  updateItemSchema,
  addMemberSchema,
  updateMemberSchema,
  addCommentSchema,
  editCommentSchema,
};

