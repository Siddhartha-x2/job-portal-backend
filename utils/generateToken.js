const jwt = require('jsonwebtoken');

function cookieOptions(config) {
  return { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api' };
}

function generateToken(res, user, config) {
  const token = jwt.sign({ userId: user.id, role: user.role, v: user.tokenVersion }, config.jwtSecret, {
    algorithm: 'HS256', subject: user.id, expiresIn: config.tokenTtl,
    issuer: 'job-portal-api', audience: 'job-portal-users'
  });
  res.cookie('token', token, { ...cookieOptions(config), maxAge: config.tokenTtl * 1000 });
}

module.exports = { generateToken, cookieOptions };
