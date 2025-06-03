import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("token");
};

// Create axios instance with auth header
const createAuthenticatedRequest = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  };
};

export const notificationService = {
  // Get all notifications
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/notifications?page=${page}&limit=${limit}`,
        createAuthenticatedRequest(),
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error.response?.data || error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/notifications/unread-count`,
        createAuthenticatedRequest(),
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error.response?.data || error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        createAuthenticatedRequest(),
      );
      return response.data;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error.response?.data || error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {},
        createAuthenticatedRequest(),
      );
      return response.data;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error.response?.data || error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        createAuthenticatedRequest(),
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error.response?.data || error;
    }
  },
};

export default notificationService;
