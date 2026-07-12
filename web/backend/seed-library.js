const mongoose = require('mongoose');
const User = require('./src/models/User');
const UserCollection = require('./src/models/UserCollection');
const Paper = require('./src/models/Paper');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301').then(async () => {
  const user = await User.findOne({ email: /phong/i });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  // Create collections
  let col = await UserCollection.findOne({ user_id: user._id, collection_name: 'Đọc sau' });
  if (!col) {
    col = await UserCollection.create({ user_id: user._id, collection_name: 'Đọc sau', description: 'Các bài báo cần đọc' });
    console.log('Created collection', col._id);
  } else {
    console.log('Collection exists', col._id);
  }
  
  const papers = await Paper.find().limit(5);
  for (const p of papers) {
    const exists = col.papers.find(cp => cp.paper_id.toString() === p._id.toString());
    if (!exists) {
      await UserCollection.updateOne({ _id: col._id }, { $push: { papers: { paper_id: p._id, saved_at: new Date() } } });
      console.log('Saved paper', p._id);
    }
  }
  console.log('Done');
  process.exit(0);
}).catch(console.error);
