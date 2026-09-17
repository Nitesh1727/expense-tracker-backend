import jwt from 'jsonwebtoken';
import env from '../config/env.js';

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  return payload.sub;
}

export { signToken, verifyToken };
