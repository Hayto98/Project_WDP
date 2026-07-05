const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches `req.user` with { id, email, roles }.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.unauthorized(res, 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles || ['Student'],
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token expired');
    }
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
}

/**
 * Optional authentication — attaches req.user if token present, but doesn't block.
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles || ['Student'],
    };
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, optionalAuth };
