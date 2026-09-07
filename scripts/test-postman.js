const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const newman = require('newman');
const createApp = require('../app');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');
const startTempDatabase = require('./temp-database');

async function run() {
  let database, server;
  try {
    database = await startTempDatabase();
    await connectDatabase(database.getUri('job_portal_postman'));
    const config = { jwtSecret: randomBytes(32).toString('hex'), tokenTtl: 86400, production: false, origin: 'http://localhost:5000' };
    const adminPassword = randomBytes(18).toString('base64url');
    const admin = await User.create({ name: 'Test Admin', email: 'admin@example.com', password: adminPassword, role: 'admin' });
    server = createApp(config).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const expiredToken = jwt.sign({ v: 0 }, config.jwtSecret, {
      subject: admin.id, expiresIn: -60, issuer: 'job-portal-api', audience: 'job-portal-users', algorithm: 'HS256'
    });
    const resultDirectory = path.join(__dirname, '..', 'test-results');
    fs.mkdirSync(resultDirectory, { recursive: true });
    const summary = await new Promise((resolve, reject) => newman.run({
      collection: require('../postman/Job_Portal_API.postman_collection.json'),
      environment: require('../postman/Job_Portal_Local.postman_environment.json'),
      envVar: [
        { key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}/api` },
        { key: 'adminEmail', value: 'admin@example.com' }, { key: 'adminPassword', value: adminPassword },
        { key: 'expiredToken', value: expiredToken }
      ],
      reporters: ['cli'], timeoutRequest: 10000
    }, (err, result) => err ? reject(err) : resolve(result)));
    // Keep only counts and assertion failures; full Newman reports contain live cookies.
    const report = {
      date: new Date().toISOString(), stats: summary.run.stats,
      failures: summary.run.failures.map(f => ({ request: f.source.name, message: f.error.message }))
    };
    fs.writeFileSync(path.join(resultDirectory, 'postman-summary.json'), JSON.stringify(report, null, 2));
    if (summary.run.failures.length) process.exitCode = 1;
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    if (database) await database.stop();
  }
}

run().catch(err => { console.error(err.message); process.exitCode = 1; });
