const mongoose = require('mongoose');
const { loadConfig } = require('./config/env');
const { connectDatabase } = require('./config/db');
const createApp = require('./app');

async function start() {
  const config = loadConfig();
  await connectDatabase(config.mongoUri);
  const server = createApp(config).listen(config.port, () => console.log(`Job Portal API: ${config.origin}/api/health`));
  server.on('error', async err => {
    console.error('Server failed:', err.code);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  function shutdown() {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async err => {
  console.error('Could not start:', err.name === 'MongooseServerSelectionError' ? 'MongoDB is not reachable. Check MONGO_URI.' : err.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
