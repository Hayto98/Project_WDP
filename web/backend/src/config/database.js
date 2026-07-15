const dns = require('dns');
const mongoose = require('mongoose');
const { mongodbUri, nodeEnv } = require('./env');

/**
 * Node on Windows often hits a local DNS that refuses SRV lookups for mongodb+srv.
 * Prefer public resolvers so Atlas SRV resolves reliably.
 */
function ensureMongodbDns() {
  if (!String(mongodbUri).startsWith('mongodb+srv://')) return;

  const fromEnv = String(process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const servers = fromEnv.length ? fromEnv : ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
  try {
    dns.setServers(servers);
  } catch (err) {
    console.warn('⚠️  Could not set DNS servers for MongoDB SRV:', err.message);
  }
}

const connectDB = async () => {
  try {
    ensureMongodbDns();
    await mongoose.connect(mongodbUri);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (String(err.message || '').includes('querySrv') || String(err.message || '').includes('ECONNREFUSED')) {
      console.error('💡 Tip: Atlas SRV DNS failed. Check Wi‑Fi/VPN DNS, or set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env');
    }
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  if (nodeEnv !== 'test') {
    console.warn('⚠️  MongoDB disconnected');
  }
});

module.exports = connectDB;
