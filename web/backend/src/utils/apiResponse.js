/**
 * Standardized API response helpers.
 */

class ApiResponse {
  /**
   * Success response
   */
  static success(res, data, statusCode = 200, meta = null) {
    const body = { success: true, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  /**
   * Created response (201)
   */
  static created(res, data) {
    return ApiResponse.success(res, data, 201);
  }

  /**
   * Error response
   */
  static error(res, message, statusCode = 500, code = 'INTERNAL_ERROR') {
    return res.status(statusCode).json({
      success: false,
      error: { code, message },
    });
  }

  /**
   * Validation error (400)
   */
  static validationError(res, message) {
    return ApiResponse.error(res, message, 400, 'VALIDATION_ERROR');
  }

  /**
   * Not found (404)
   */
  static notFound(res, message = 'Resource not found') {
    return ApiResponse.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Unauthorized (401)
   */
  static unauthorized(res, message = 'Authentication required') {
    return ApiResponse.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Forbidden (403)
   */
  static forbidden(res, message = 'Access denied') {
    return ApiResponse.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Paginated success response
   */
  static paginated(res, data, page, limit, total) {
    return ApiResponse.success(res, data, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }
}

module.exports = ApiResponse;
