const Notification = require("../models/Notification");

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    console.log("Getting notifications for user:", req.user._id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id })
      .populate({
        path: "post",
        select: "title stateName",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments({
      recipient: req.user._id,
    });

    console.log(
      `Found ${notifications.length} notifications for user ${req.user._id}`,
    );

    res.status(200).json({
      status: "success",
      results: notifications.length,
      total: totalNotifications,
      data: {
        notifications,
      },
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true },
    );

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: "Notification not found",
      });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    console.log("Getting unread count for user:", req.user._id);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    console.log(`User ${req.user._id} has ${unreadCount} unread notifications`);

    res.status(200).json({
      status: "success",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    next(error);
  }
};
