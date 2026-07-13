require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

require('./src/config/database')();

setTimeout(async () => {
  const User = require('./src/models/User');
  const user = await User.findOne({ email: 'phingtran93@gmail.com' });
  console.log('User found:', user._id);
  
  const token = jwt.sign(
    { id: user._id, roles: user.roles },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
  
  console.log('Token:', token);
  
  const res = await fetch('http://localhost:5001/api/v1/collaboration/invites', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  process.exit(0);
}, 2000);
