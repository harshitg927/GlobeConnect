import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { useToast } from "@chakra-ui/react";
import axios from "axios";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const API_BASE_URL = process.env.REACT_APP_API_URL;

  // Fetch notifications from server
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      console.log(
        "Fetching notifications with token:",
        token ? "Present" : "Missing",
      );

      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      console.log("Notifications response:", response.data);

      if (response.data.status === "success") {
        setNotifications(response.data.data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      console.error("Error response:", error.response?.data);
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      console.log(
        "Fetching unread count with token:",
        token ? "Present" : "Missing",
      );

      const response = await axios.get(
        `${API_BASE_URL}/api/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        },
      );

      console.log("Unread count response:", response.data);

      if (response.data.status === "success") {
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        },
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif,
        ),
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        },
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Update local state
      const deletedNotification = notifications.find(
        (n) => n._id === notificationId,
      );
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId),
      );

      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    if (socket && user) {
      socket.on("newNotification", (notification) => {
        console.log("New notification received:", notification);

        // Add to notifications list
        setNotifications((prev) => [notification, ...prev]);

        // Increment unread count
        setUnreadCount((prev) => prev + 1);

        // Show toast notification
        toast({
          title: notification.title,
          description: notification.message,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      });

      return () => {
        socket.off("newNotification");
      };
    }
  }, [socket, user, toast]);

  // Fetch initial data when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
