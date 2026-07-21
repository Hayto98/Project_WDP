require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Notification = require('./src/models/Notification');
const CollaborationInvite = require('./src/models/CollaborationInvite');

async function test() {
  await connectDB();
  const userId = '6a53393ea06daa97531253eb'; // The user ID for phingtran93@gmail.com
  const notif = await Notification.findOne({ user_id: userId, notification_type: 'invite' }).sort({ created_at: -1 }).lean();
  console.log("Notif:", notif);
  if (notif && notif.meta && notif.meta.length > 0) {
    const inviteId = notif.meta[0];
    const invite = await CollaborationInvite.findById(inviteId).lean();
    console.log("Associated Invite:", invite);
  }
  process.exit(0);
}

test();
