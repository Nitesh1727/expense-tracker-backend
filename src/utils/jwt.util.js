const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  return payload.sub;
}

module.exports = { signToken, verifyToken };
