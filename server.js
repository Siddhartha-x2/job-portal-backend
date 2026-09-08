require('dotenv').config({ quiet: true });
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jobSeekerAPI = require('./APIs/jobSeekerAPI');
const employerAPI = require('./APIs/employerAPI');
const adminAPI = require('./APIs/adminAPI');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.body = req.body || {};
  res.set('Cache-Control', 'no-store');
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`)) {
      return res.status(403).json({ success: false, message: 'Cross-origin writes are not allowed' });
    }
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Job Portal API is running' }));
app.use('/jobSeeker-api', jobSeekerAPI);
app.use('/employer-api', employerAPI);
app.use('/admin-api', adminAPI);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(require('./middlewares/handleError'));

async function start() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace')) {
    throw new Error('Set MONGO_URI and a JWT_SECRET of at least 32 characters in .env');
  }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`Job Portal API: http://localhost:${port}/api/health`));
  server.on('error', async error => {
    console.error('Server failed:', error.code);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }));
  }
}

if (require.main === module) {
  start().catch(async error => {
    console.error('Startup failed:', error.name === 'MongooseServerSelectionError' ? 'Start MongoDB and check MONGO_URI.' : error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = app;
