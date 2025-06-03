import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log("Creating socket connection for user:", user._id);

      // Create socket connection
      const newSocket = io(
        process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL,
        {
          withCredentials: true,
        },
      );

      newSocket.on("connect", () => {
        console.log("Connected to server with socket ID:", newSocket.id);
        setIsConnected(true);

        // Join user's personal room for notifications
        console.log("Joining notification room for user:", user._id);
        newSocket.emit("join", user._id);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      setSocket(newSocket);

      return () => {
        console.log("Closing socket connection");
        newSocket.close();
      };
    } else {
      // Disconnect socket when user logs out
      if (socket) {
        console.log("User logged out, closing socket");
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
