require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Notification = require('./src/models/Notification');

async function test() {
  await connectDB();
  const notifs = await Notification.find({ notification_type: 'invite' }).sort({ created_at: -1 }).limit(3).lean();
  console.log("Last 3 Invites Notifications:", JSON.stringify(notifs, null, 2));
  process.exit(0);
}

test();
