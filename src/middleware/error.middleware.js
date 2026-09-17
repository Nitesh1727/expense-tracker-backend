import env from '../config/env.js';

/**
 * Single place that turns a thrown error into an HTTP response. Express 5
 * forwards both sync throws and rejected promises from async route
 * handlers here automatically — no asyncHandler wrapper needed on
 * controllers.
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  if (err.isApiError) {
    return res.status(err.statusCode).json({ error: { message: err.message } });
  }

  // Mongoose duplicate key (e.g. category name already exists for this user).
  if (err.code === 11000) {
    return res.status(409).json({ error: { message: 'Already exists' } });
  }

  // Unexpected error — log full detail server-side, never leak internals to the client.
  console.error(err);
  return res.status(500).json({
    error: { message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message },
  });
}

export default errorMiddleware;
