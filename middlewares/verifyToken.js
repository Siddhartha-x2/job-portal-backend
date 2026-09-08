const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const cookieOptions = {
  httpOnly: true, sameSite: 'strict', path: '/',
  secure: process.env.NODE_ENV === 'production'
};

async function verifyToken(req, res, next) {
  let decoded;
  try {
    decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ success: false, message: 'Missing, invalid or expired token' });
  }
  if (!decoded || typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  const user = await User.findOne({ _id: decoded.id, deletedAt: null }).select('+tokenVersion');
  if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });
  if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended' });
  if (decoded.v !== user.tokenVersion) return res.status(401).json({ success: false, message: 'Please log in again' });
  req.user = { ...decoded, role: user.role };
  req.profile = user;
  next();
}

// All three role APIs use the same login and cookie settings.
function login(role) {
  return async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ success: false, message: 'Provide an email and a password of 8 to 72 bytes' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase(), role, deletedAt: null }).select('+password +tokenVersion');
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password' });
    }
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended' });
    const token = jwt.sign({ id: user.id, role: user.role, v: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('accessToken', token, { ...cookieOptions, maxAge: 86400000 });
    res.json({ success: true, message: 'Logged in', data: user });
  };
}

async function logout(req, res) {
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('accessToken', cookieOptions);
  res.json({ success: true, message: 'Logged out' });
}

module.exports = { verifyToken, login, logout };
