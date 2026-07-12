const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwt: jwtConfig } = require('../config/env');
const { logAction } = require('../utils/systemLogger');

/**
 * Generate JWT tokens for a user.
 */
function generateTokens(user) {
  const payload = { id: user._id, email: user.email, roles: user.roles };

  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

/**
 * Register a new user.
 */
async function register({ email, password, full_name }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const user = await User.create({
    email: email.toLowerCase(),
    password_hash,
    full_name,
    roles: ['Student'],
    status: 'Active',
  });

  const tokens = generateTokens(user);

  return {
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      status: user.status,
    },
    ...tokens,
  };
}

/**
 * Login with email + password.
 */
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    logAction('Login', null, null, { success: false, email, reason: 'User not found' });
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  if (user.status === 'Banned') {
    logAction('Login', user._id, null, { success: false, email, reason: 'Account banned' });
    throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logAction('Login', user._id, null, { success: false, email, reason: 'Wrong password' });
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const tokens = generateTokens(user);
  logAction('Login', user._id, null, { success: true, email });

  return {
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      status: user.status,
    },
    ...tokens,
  };
}

async function refreshSession(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  const user = await User.findById(decoded.id);
  if (!user || user.status !== 'Active') {
    throw Object.assign(new Error('User is not active'), { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  const tokens = generateTokens(user);
  return {
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      status: user.status,
    },
    ...tokens,
  };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password changed successfully' };
}

/**
 * Refresh access credentials using a valid refresh token.
 */
async function refreshTokens(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Refresh token expired, please login again'
      : 'Invalid refresh token';
    throw Object.assign(new Error(message), { statusCode: 401 });
  }

  const user = await User.findById(decoded.id).select('-password_hash');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  if (user.status === 'Banned') {
    throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
  }

  const tokens = generateTokens(user);
  return {
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      status: user.status,
    },
    ...tokens,
  };
}

/**
 * Change password for authenticated user.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password changed successfully' };
}

/**
 * Get current user profile (including embedded data).
 */
async function getProfile(userId) {
  const user = await User.findById(userId).select('-password_hash').lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  user.id = user._id;
  return user;
}

/**
 * Update current user profile.
 */
async function updateProfile(userId, updates) {
  const allowed = {};
  if (updates.full_name) allowed.full_name = updates.full_name;
  if (updates.email) {
    const email = updates.email.toLowerCase();
    const existing = await User.findOne({ email, _id: { $ne: userId } }).select('_id').lean();
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'CONFLICT' });
    }
    allowed.email = email;
  }

  const user = await User.findByIdAndUpdate(userId, allowed, {
    returnDocument: 'after',
    runValidators: true,
  }).select('-password_hash');

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user;
}

/**
 * Update dashboard layout.
 */
async function updateDashboardLayout(userId, layout) {
  const user = await User.findByIdAndUpdate(
    userId,
    { dashboard_layout: layout },
    { returnDocument: 'after' },
  ).select('dashboard_layout');

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user.dashboard_layout;
}

module.exports = {
  register,
  login,
  refreshTokens,
  changePassword,
  getProfile,
  updateProfile,
  updateDashboardLayout,
};
