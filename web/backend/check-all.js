require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const CollaborationInvite = require('./src/models/CollaborationInvite');
const Notification = require('./src/models/Notification');

async function test() {
  await connectDB();
  const invites = await CollaborationInvite.find().sort({ sent_at: -1 }).limit(3).lean();
  console.log("Last 3 Invites:");
  console.dir(invites, { depth: null });
  const notifs = await Notification.find({ notification_type: 'invite' }).sort({ created_at: -1 }).limit(3).lean();
  console.log("Last 3 Notifs:");
  console.dir(notifs, { depth: null });
  process.exit(0);
}

test();
