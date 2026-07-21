require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Notification = require('./src/models/Notification');
const CollaborationInvite = require('./src/models/CollaborationInvite');

async function backfill() {
  await connectDB();
  const notifs = await Notification.find({ notification_type: 'invite' });
  for (const n of notifs) {
    if (!n.meta || n.meta.length === 0) {
      // Find the invite
      const invite = await CollaborationInvite.findOne({ invitee_user_id: n.user_id }).sort({ created_at: -1 });
      if (invite) {
        n.meta = [invite._id.toString()];
        await n.save();
        console.log(`Backfilled notification ${n._id} with invite ${invite._id}`);
      }
    }
  }
  process.exit(0);
}
backfill();
