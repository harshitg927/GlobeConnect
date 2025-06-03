const socketIO = require("socket.io");

let io;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {Object} server - HTTP server instance
 */
const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Join a room for specific post
    socket.on("join-post", (postId) => {
      socket.join(`post:${postId}`);
      console.log(`Socket ${socket.id} joined room for post: ${postId}`);
    });

    // Leave a post room
    socket.on("leave-post", (postId) => {
      socket.leave(`post:${postId}`);
      console.log(`Socket ${socket.id} left room for post: ${postId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
