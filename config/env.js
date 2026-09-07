require('dotenv').config({ quiet: true });

function loadConfig() {
  const port = Number(process.env.PORT || 5000);
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const duration = /^(\d+)(s|m|h|d)$/.exec(expiresIn);
  const tokenTtl = duration ? Number(duration[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[duration[2]] : 0;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace')) {
    throw new Error('Set JWT_SECRET to a random value of at least 32 characters in .env');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (tokenTtl < 60 || tokenTtl > 604800) throw new Error('JWT_EXPIRES_IN must be between 60s and 7d');
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in .env');
  const origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
  if (new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must not include a path or trailing slash');
  const production = process.env.NODE_ENV === 'production';
  if (production && !origin.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS');
  return { port, tokenTtl, jwtSecret, mongoUri: process.env.MONGO_URI, origin, production };
}

module.exports = { loadConfig };
