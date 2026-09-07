const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { loadConfig } = require('../config/env');

const config = loadConfig();
const environment = require('../postman/Job_Portal_Local.postman_environment.json');
environment.name = 'Job Portal - private local settings';
const localValues = {
  baseUrl: `${config.origin}/api`,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  expiredToken: jwt.sign({ v: 0 }, config.jwtSecret, {
    subject: 'aaaaaaaaaaaaaaaaaaaaaaaa', expiresIn: -60, algorithm: 'HS256',
    issuer: 'job-portal-api', audience: 'job-portal-users'
  })
};
for (const entry of environment.values) {
  if (localValues[entry.key] !== undefined) entry.value = localValues[entry.key];
}
const output = path.join(__dirname, '..', '.cache', 'local.postman_environment.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(environment, null, 2));
console.log('Import .cache/local.postman_environment.json in Postman. Keep it private.');
