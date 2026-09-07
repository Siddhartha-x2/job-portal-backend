const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const createApp = require('../app');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');
const Job = require('../models/Job');
const startTempDatabase = require('./temp-database');

let database;
let server;
async function stop() {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
}

async function demo() {
  database = await startTempDatabase();
  await connectDatabase(database.getUri('job_portal_demo'));
  const password = randomBytes(18).toString('base64url');
  const [employer] = await User.create([
    { name: 'Riya Sharma', email: 'employer@example.com', password, role: 'employer' },
    { name: 'Arjun Kumar', email: 'seeker@example.com', password, role: 'jobseeker', skills: ['Node.js', 'MongoDB'] },
    { name: 'Portal Admin', email: 'admin@example.com', password, role: 'admin' }
  ]);
  await Job.create({
    title: 'Backend Developer Intern', companyName: 'TechCorp India', description: 'Build and test REST APIs with Node.js, Express and MongoDB.',
    location: 'Bengaluru', employmentType: 'internship', salaryRange: { min: 15000, max: 25000, currency: 'INR' },
    requiredSkills: ['Node.js', 'MongoDB'], experienceRequirement: 0, applicationDeadline: new Date(Date.now() + 30 * 86400000), employer: employer._id
  });
  const config = { port: 5000, origin: 'http://localhost:5000', jwtSecret: randomBytes(32).toString('hex'), tokenTtl: 86400, production: false };
  const environment = require('../postman/Job_Portal_Local.postman_environment.json');
  environment.name = 'Job Portal Demo';
  environment.values.find(value => value.key === 'adminPassword').value = password;
  environment.values.find(value => value.key === 'expiredToken').value = jwt.sign({ v: 0 }, config.jwtSecret, {
    subject: 'aaaaaaaaaaaaaaaaaaaaaaaa', expiresIn: -60, algorithm: 'HS256', issuer: 'job-portal-api', audience: 'job-portal-users'
  });
  fs.mkdirSync(path.join(__dirname, '..', '.cache'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', '.cache', 'demo.postman_environment.json'), JSON.stringify(environment, null, 2));
  server = createApp(config).listen(5000, '127.0.0.1', () => {
    console.log('Demo API: http://localhost:5000/api/health');
    console.log('Accounts: seeker@example.com, employer@example.com, admin@example.com');
    console.log(`Password for all three: ${password}`);
    console.log('Temporary demo database. Data is removed when this command stops.');
    console.log('Postman demo environment: .cache/demo.postman_environment.json');
  });
  server.on('error', async err => {
    console.error('Demo server failed:', err.code);
    server = undefined;
    await stop();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop().then(() => process.exit(0)));
}

demo().catch(async err => {
  console.error('Could not start demo:', err.message);
  await stop();
  process.exitCode = 1;
});
