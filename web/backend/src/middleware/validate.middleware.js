const ApiResponse = require('../utils/apiResponse');

/**
 * Joi validation middleware factory.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @param {'body'|'query'|'params'} source - Where to read data from (default: 'body')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return ApiResponse.validationError(res, message);
    }

    // Replace source data with validated/sanitized values
    req[source] = value;
    next();
  };
}

module.exports = { validate };
