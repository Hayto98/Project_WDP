require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const CollaborationInvite = require('./src/models/CollaborationInvite');

async function test() {
  await connectDB();
  const invite = await CollaborationInvite.findById('6a5ef5b00a3c35d87c17702d').lean();
  console.log("Invite:", invite);
  process.exit(0);
}

test();
