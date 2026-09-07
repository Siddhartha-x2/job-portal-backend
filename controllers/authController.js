const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateToken, cookieOptions } = require('../utils/generateToken');

async function register(req, res) {
  const user = await User.create(req.body);
  res.status(201).json({ success: true, message: 'Account created. You can now log in.', data: user });
}

async function login(req, res) {
  const user = await User.findOne({ email: req.body.email, deletedAt: null }).select('+password +tokenVersion');
  if (!user || !(await user.matchPassword(req.body.password))) throw new ApiError(401, 'Incorrect email or password');
  if (user.status !== 'active') throw new ApiError(403, 'Your account is suspended');
  generateToken(res, user, req.app.locals.config);
  res.json({ success: true, message: 'Login successful', data: user });
}

async function logout(req, res) {
  // Invalidate copied cookies as well as clearing the browser's local cookie.
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('token', cookieOptions(req.app.locals.config));
  res.json({ success: true, message: 'Logged out of all sessions' });
}

module.exports = { register, login, logout };
