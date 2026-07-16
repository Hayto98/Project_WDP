let io;

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: '*', // For development, allow all origins. In production, restrict to frontend domain.
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_workspace', (workspaceId) => {
        if (workspaceId) {
          socket.join(workspaceId);
          console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
        }
      });

      socket.on('leave_workspace', (workspaceId) => {
        if (workspaceId) {
          socket.leave(workspaceId);
          console.log(`Socket ${socket.id} left workspace ${workspaceId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
