require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { z } = require('zod');
const User = require('../models/User');
const { connectDatabase } = require('../config/db');

async function seed() {
  const account = z.object({
    name: z.string().trim().min(2).max(80), email: z.email().toLowerCase(),
    password: z.string().min(8).refine(value => Buffer.byteLength(value) <= 72)
  }).parse({ name: process.env.ADMIN_NAME || 'Portal Admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in .env');
  await connectDatabase(process.env.MONGO_URI);
  const existing = await User.findOne({ email: account.email });
  if (existing) {
    if (existing.role !== 'admin' || existing.deletedAt || existing.status !== 'active') {
      throw new Error('That email belongs to a non-admin or inactive account. Choose a different admin email.');
    }
    console.log('Admin already exists. Password was not changed.');
    return;
  }
  await User.create({ ...account, role: 'admin' });
  console.log('Admin account created. Log in through POST /api/auth/login.');
}

seed().catch(err => {
  console.error(err.name === 'ZodError' ? 'Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters and at most 72 UTF-8 bytes) in .env.' : err.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
