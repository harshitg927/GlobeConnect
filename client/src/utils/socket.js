import { io } from "socket.io-client";

let socket;

/**
 * Initialize Socket.IO connection
 * @returns {Object} Socket.IO instance
 */
export const initSocket = () => {
  if (!socket) {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || "http://localhost:5000";

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason);
    });
  }

  return socket;
};

/**
 * Join a post room to receive real-time updates for that post
 * @param {string} postId - The ID of the post to join
 */
export const joinPostRoom = (postId) => {
  if (!socket) initSocket();
  socket.emit("join-post", postId);
};

/**
 * Leave a post room when no longer viewing that post
 * @param {string} postId - The ID of the post to leave
 */
export const leavePostRoom = (postId) => {
  if (socket) socket.emit("leave-post", postId);
};

/**
 * Get the Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
export const getSocket = () => {
  if (!socket) return initSocket();
  return socket;
};

/**
 * Disconnect Socket.IO connection
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
