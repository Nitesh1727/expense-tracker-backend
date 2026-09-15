const ApiError = require('../utils/ApiError');

/**
 * Runs a zod schema against { body, query, params } and stashes the parsed
 * (coerced/defaulted) result on req.valid. This is the only place request
 * shape is checked — controllers read from req.valid, never req.query/
 * req.params directly, because Express 5's req.query is a getter with no
 * setter (can't be reassigned in place — reassigning it is a silent no-op,
 * confirmed against the installed express@5.2.1), so validated/defaulted
 * query values can't be written back onto it.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });

    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new ApiError(400, message);
    }

    req.valid = result.data;
    next();
  };
}

module.exports = validate;
