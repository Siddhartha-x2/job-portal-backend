const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { loadConfig } = require('../config/env');
const { connectDatabase } = require('../config/db');
const createApp = require('../app');

async function startLocal() {
  const config = loadConfig();
  const uri = new URL(config.mongoUri);
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' || uri.username || uri.password || uri.search) {
    throw new Error('npm run local expects a plain mongodb://127.0.0.1:PORT/DATABASE URI. Use npm start with Atlas or an existing MongoDB server.');
  }
  const databasePort = Number(uri.port || 27017);
  const dataPath = path.join(__dirname, '..', '.data', 'mongodb');
  fs.mkdirSync(dataPath, { recursive: true });
  let database, server, stopping;

  function stop() {
    if (!stopping) stopping = (async () => {
      if (server?.listening) await new Promise(resolve => {
        server.close(resolve);
        server.closeIdleConnections();
      });
      try {
        if (mongoose.connection.readyState === 1) await mongoose.connection.db.admin().command({ fsync: 1 });
      } finally {
        await mongoose.disconnect();
        // Keep the WiredTiger files in our explicit data directory on every stop.
        if (database) await database.stop({ doCleanup: false, force: false });
      }
    })();
    return stopping;
  }

  try {
    database = await MongoMemoryServer.create({
      binary: { version: '7.0.24', downloadDir: path.join(__dirname, '..', '.cache', 'mongodb') },
      instance: { port: databasePort, portGeneration: false, ip: '127.0.0.1', dbPath: dataPath, storageEngine: 'wiredTiger' },
      spawn: { windowsHide: true }
    });
    await connectDatabase(config.mongoUri);
    server = createApp(config).listen(config.port, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    return { stop, config, dataPath };
  } catch (error) {
    await stop();
    throw error;
  }
}

if (require.main === module) {
  startLocal().then(local => {
    console.log(`Job Portal API: ${local.config.origin}/api/health`);
    console.log(`MongoDB data: ${local.dataPath}`);
    console.log('Persistent local database. Stop with Ctrl+C; restart with npm run local.');
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => local.stop().then(() => process.exit(0)).catch(() => process.exit(1)));
    }
  }).catch(error => {
    console.error('Local startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = startLocal;
