const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// Get unread count (must be before /:id routes)
router.get("/unread-count", protect, notificationController.getUnreadCount);

// Get user's notifications
router.get("/", protect, notificationController.getNotifications);

// Mark all notifications as read (must be before /:id routes)
router.patch("/mark-all-read", protect, notificationController.markAllAsRead);

// Mark notification as read
router.patch("/:id/read", protect, notificationController.markAsRead);

// Delete notification
router.delete("/:id", protect, notificationController.deleteNotification);

module.exports = router;
