require('dotenv').config();
require('./src/config/database')();
setTimeout(async () => {
  const Workspace = require('./src/models/Workspace');
  const userId = '6a53393ea06daa97531253eb';
  const workspaceId = '6a5334b8fdffc204d3c5d638';
  await Workspace.updateOne(
    { _id: workspaceId, 'members.user_id': { $ne: userId } },
    { $push: { members: { user_id: userId, name: 'phong1', initials: 'PH', role: 'editor', joined_at: new Date() } } }
  );
  console.log('Added phong1 to workspace');
  process.exit(0);
}, 2000);
