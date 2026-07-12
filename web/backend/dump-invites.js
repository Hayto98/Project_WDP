require('dotenv').config();
require('./src/config/database')();
setTimeout(async () => {
  const CollaborationInvite = require('./src/models/CollaborationInvite');
  const Workspace = require('./src/models/Workspace');
  
  const invites = await CollaborationInvite.find().lean();
  console.log('All Invites:', JSON.stringify(invites, null, 2));
  
  const workspaces = await Workspace.find().lean();
  console.log('All Workspaces:', JSON.stringify(workspaces, null, 2));
  
  process.exit(0);
}, 2000);
