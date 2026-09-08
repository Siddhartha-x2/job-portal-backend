require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/userModel');

async function seedAdmin() {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set MONGO_URI, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  }
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.init();
  const existing = await User.findOne({ email: ADMIN_EMAIL.trim().toLowerCase() });
  if (existing) {
    if (existing.role !== 'admin' || existing.status !== 'active' || existing.deletedAt) {
      throw new Error('Choose another email; this account is not an active admin');
    }
    console.log('Admin already exists. Password unchanged.');
    return;
  }
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log('Admin created. Log in at POST /admin-api/admin/login.');
}

seedAdmin().catch(error => {
  console.error('Admin setup failed:', error.name === 'ValidationError' ? 'Check the admin name, email and password (8 to 72 bytes).' : error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
