const ApiResponse = require('../utils/apiResponse');

/**
 * Role-Based Access Control middleware.
 * Usage: rbac('Admin') or rbac('Admin', 'Student')
 *
 * @param  {...string} allowedRoles - Roles that are permitted access
 */
function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return ApiResponse.forbidden(res, `Requires one of: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}

module.exports = { rbac };
