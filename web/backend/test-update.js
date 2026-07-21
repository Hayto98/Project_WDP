require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const CollaborationInvite = require('./src/models/CollaborationInvite');

async function test() {
  await connectDB();
  const inviteId = '6a5ef5b00a3c35d87c17702d';
  const userId = '6a532cbbfdffc204d3c5d62d';
  const email = 'test@gmail.com';

  const filter = { _id: inviteId };
  filter.$or = [
    { invitee_user_id: userId },
    { invitee_email: email.toLowerCase() }
  ];
  console.log("Filter:", filter);

  const invite = await CollaborationInvite.findOneAndUpdate(
    filter,
    { status: 'accepted', responded_at: new Date(), invitee_user_id: userId },
    { new: true }
  ).lean();
  
  console.log("Updated invite:", invite);
  process.exit(0);
}

test();
