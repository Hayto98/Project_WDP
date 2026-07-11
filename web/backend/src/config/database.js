const mongoose = require('mongoose');
const { mongodbUri, nodeEnv } = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(mongodbUri);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  if (nodeEnv !== 'test') {
    console.warn('⚠️  MongoDB disconnected');
  }
});

module.exports = connectDB;
