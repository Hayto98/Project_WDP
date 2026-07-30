const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  full_name: Joi.string().trim().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required().invalid(Joi.ref('currentPassword')),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(32).max(256).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
