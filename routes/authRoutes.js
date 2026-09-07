const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const auth = require('../controllers/authController');
const { getProfile } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const schema = require('../utils/validators');

module.exports = function authRoutes() {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Try again later.' }
  });
  router.post('/register', limiter, validate(schema.register), auth.register);
  router.post('/login', limiter, validate(schema.login), auth.login);
  router.post('/logout', protect, auth.logout);
  router.get('/me', protect, getProfile);
  return router;
};
