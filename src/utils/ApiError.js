/**
 * Thrown by services for any expected failure (bad credentials, not found,
 * validation, etc). error.middleware.js knows how to turn this into a clean
 * JSON response; anything that isn't an ApiError is treated as unexpected
 * and logged with a stack trace instead of trusted to be client-safe.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }
}

export default ApiError;
