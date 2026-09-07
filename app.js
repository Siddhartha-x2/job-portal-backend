const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { loadConfig } = require('./config/env');
const protectWrites = require('./middleware/security');
const errorHandler = require('./middleware/errorMiddleware');

function createApp(config = loadConfig()) {
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(protectWrites);
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Try again later.' }
  }));
  app.get('/api/health', (req, res) => res.json({ success: true, message: 'Job Portal API is running' }));
  app.use('/api/auth', require('./routes/authRoutes')());
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/jobs', require('./routes/jobRoutes'));
  app.use('/api/applications', require('./routes/applicationRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use(require('./middleware/notFoundMiddleware'));
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
