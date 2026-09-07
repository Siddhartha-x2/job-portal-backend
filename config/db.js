const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

mongoose.set('strictQuery', true);

async function connectDatabase(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    writeConcern: { w: 'majority', j: true }
  });
  // Wait for the unique indexes before accepting requests.
  await Promise.all([User.init(), Job.init(), Application.init()]);
}

module.exports = { connectDatabase };
