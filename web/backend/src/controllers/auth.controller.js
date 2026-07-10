const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function refresh(req, res) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function logout(_req, res) {
  // For JWT, logout is client-side (delete token).
  // Server-side: could blacklist token in Redis (future enhancement).
  return ApiResponse.success(res, { message: 'Logged out successfully' });
}

async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function getMe(req, res) {
  try {
    const user = await authService.getProfile(req.user.id);
    return ApiResponse.success(res, user);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updateProfile(req, res) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, user);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

async function updateDashboardLayout(req, res) {
  try {
    const layout = await authService.updateDashboardLayout(req.user.id, req.body);
    return ApiResponse.success(res, layout);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  getMe,
  updateProfile,
  updateDashboardLayout,
};
