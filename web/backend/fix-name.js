require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('workspaces').updateOne(
    { _id: new mongoose.Types.ObjectId('6a53680e2e6902b71f675657'), 'members.user_id': new mongoose.Types.ObjectId('6a532cbbfdffc204d3c5d62d') },
    { $set: { 'members.$.name': 'tran dinh phong', 'members.$.initials': 'TD' } }
  );
  console.log('Fixed name in AI workspace');
  process.exit(0);
});
