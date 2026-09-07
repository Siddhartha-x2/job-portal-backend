const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server-core');

function startTempDatabase() {
  return MongoMemoryServer.create({
    binary: { version: '7.0.24', downloadDir: path.join(__dirname, '..', '.cache', 'mongodb') },
    instance: { ip: '127.0.0.1' }
  });
}

module.exports = startTempDatabase;
