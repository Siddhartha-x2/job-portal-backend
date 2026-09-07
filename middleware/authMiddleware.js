const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function protect(req, res, next) {
  const token = req.cookies.token;
  if (!token) throw new ApiError(401, 'Please log in');
  let payload;
  try {
    payload = jwt.verify(token, req.app.locals.config.jwtSecret, {
      algorithms: ['HS256'], issuer: 'job-portal-api', audience: 'job-portal-users'
    });
  } catch {
    throw new ApiError(401, 'Invalid or expired session');
  }
  if (!payload || typeof payload !== 'object') throw new ApiError(401, 'Invalid or expired session');
  const userId = payload.userId || payload.sub;
  if (!/^[a-fA-F0-9]{24}$/.test(userId) || !Number.isInteger(payload.v)) {
    throw new ApiError(401, 'Invalid or expired session');
  }
  const user = await User.findOne({ _id: userId, deletedAt: null }).select('+tokenVersion');
  if (!user) throw new ApiError(401, 'Invalid or expired session');
  if (user.status !== 'active') throw new ApiError(403, 'Your account is suspended');
  if (user.tokenVersion !== payload.v) throw new ApiError(401, 'Invalid or expired session');
  // Read the current role and status from MongoDB, not just the token's claims.
  req.user = user;
  next();
}

module.exports = protect;
