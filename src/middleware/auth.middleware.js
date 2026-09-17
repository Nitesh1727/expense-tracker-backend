import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.util.js';
import User from '../models/user.model.js';

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing or malformed Authorization header');
  }

  let userId;
  try {
    userId = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // A JWT stays cryptographically valid until it expires even after the
  // account behind it is deleted — check the user still exists so a deleted
  // account's token is fully rejected everywhere, not just leaked through
  // as a confusing null downstream.
  const exists = await User.exists({ _id: userId });
  if (!exists) {
    throw new ApiError(401, 'Account no longer exists');
  }

  req.userId = userId;
  next();
}

export default requireAuth;
