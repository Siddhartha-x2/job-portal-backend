const jwt = require('jsonwebtoken');
const { loadConfig } = require('../config/env');

const config = loadConfig();
// Expiry is checked before the account lookup. No existing user ID is needed.
console.log(jwt.sign({ v: 0 }, config.jwtSecret, {
  subject: 'aaaaaaaaaaaaaaaaaaaaaaaa', expiresIn: -60, algorithm: 'HS256',
  issuer: 'job-portal-api', audience: 'job-portal-users'
}));
