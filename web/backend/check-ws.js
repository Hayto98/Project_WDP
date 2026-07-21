require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Workspace = require('./src/models/Workspace');

async function test() {
  await connectDB();
  const ws = await Workspace.findById('6a5ef58b0a3c35d87c17702b').lean();
  console.log("Workspace members:", ws.members);
  process.exit(0);
}

test();
