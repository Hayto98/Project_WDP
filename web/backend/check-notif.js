require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Notification = require('./src/models/Notification');
const CollaborationInvite = require('./src/models/CollaborationInvite');
const User = require('./src/models/User');

async function test() {
  await connectDB();
  const invites = await CollaborationInvite.find().sort({ sent_at: -1 }).limit(1).lean();
  console.log("Last Invite:", invites);
  if (invites.length > 0) {
    const invite = invites[0];
    const notifs = await Notification.find({ user_id: invite.invitee_user_id, notification_type: 'invite' }).lean();
    console.log("Notifications for invitee:", notifs);
  }
  process.exit(0);
}

test();
