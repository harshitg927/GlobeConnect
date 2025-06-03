const Notification = require("../models/Notification");
const User = require("../models/User");

// Function to create notifications for users who have favorited a location
const createNotificationsForFavoriteLocation = async (post, io) => {
  try {
    // Find users who have this location in their favorites
    const usersWithFavoriteLocation = await User.find({
      "favorites.state": { $regex: new RegExp(post.stateName, "i") },
    });

    // Create notifications for each user
    const notificationPromises = usersWithFavoriteLocation.map(async (user) => {
      // Don't notify the author of the post
      if (user._id.toString() === post.author.toString()) {
        return null;
      }

      // Create notification
      const notification = await Notification.create({
        recipient: user._id,
        type: "new_post_favorite_location",
        title: "New Post in Your Favorite Location!",
        message: `A new post "${post.title}" has been created in ${post.stateName}`,
        post: post._id,
        location: {
          stateName: post.stateName,
        },
      });

      // Emit real-time notification to the user if they're connected
      if (io) {
        try {
          const notificationData = {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            post: {
              _id: notification.post._id,
              title: notification.post.title,
              stateName: notification.post.stateName,
            },
            location: notification.location,
            read: notification.read,
            createdAt: notification.createdAt,
          };

          io.to(`user_${user._id}`).emit("newNotification", notificationData);
          console.log(`Emitted notification to user ${user._id}`);
        } catch (emitError) {
          console.error(
            `Error emitting notification to user ${user._id}:`,
            emitError
          );
        }
      }

      return notification;
    });

    // Wait for all notifications to be created
    const notifications = await Promise.all(notificationPromises);

    // Filter out null values (author notifications)
    const validNotifications = notifications.filter((n) => n !== null);

    console.log(
      `Created ${validNotifications.length} notifications for new post in ${post.stateName}`
    );

    return validNotifications;
  } catch (error) {
    console.error("Error creating notifications for favorite location:", error);
    throw error;
  }
};

// Enhanced function to match favorites more precisely
const createNotificationsForFavoriteLocationEnhanced = async (post, io) => {
  try {
    // Find users who have this location in their favorites
    // Match by state name
    const query = {
      $or: [
        { "favorites.state": { $regex: new RegExp(post.stateName, "i") } },
        { "favorites.country": { $regex: new RegExp(post.stateName, "i") } },
        {
          "favorites.displayName": { $regex: new RegExp(post.stateName, "i") },
        },
      ],
    };

    const usersWithFavoriteLocation = await User.find(query);

    // Create notifications for each user
    const notificationPromises = usersWithFavoriteLocation.map(async (user) => {
      // Don't notify the author of the post
      if (user._id.toString() === post.author.toString()) {
        return null;
      }

      // Find the specific favorite location that matches
      const matchingFavorite = user.favorites.find(
        (fav) =>
          (fav.state &&
            fav.state.toLowerCase().includes(post.stateName.toLowerCase())) ||
          (fav.country &&
            fav.country.toLowerCase().includes(post.stateName.toLowerCase())) ||
          (fav.displayName &&
            fav.displayName
              .toLowerCase()
              .includes(post.stateName.toLowerCase()))
      );

      if (!matchingFavorite) {
        return null;
      }

      // Create notification
      const notification = await Notification.create({
        recipient: user._id,
        type: "new_post_favorite_location",
        title: "New Post in Your Favorite Location!",
        message: `A new post "${post.title}" has been created in ${post.stateName}`,
        post: post._id,
        location: {
          stateName: post.stateName,
          city: matchingFavorite.city,
          country: matchingFavorite.country,
        },
      });

      // Populate the post data for the notification
      await notification.populate({
        path: "post",
        select: "title stateName",
      });

      // Emit real-time notification to the user if they're connected
      if (io) {
        try {
          const notificationData = {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            post: {
              _id: notification.post._id,
              title: notification.post.title,
              stateName: notification.post.stateName,
            },
            location: notification.location,
            read: notification.read,
            createdAt: notification.createdAt,
          };

          io.to(`user_${user._id}`).emit("newNotification", notificationData);
          console.log(`Emitted notification to user ${user._id}`);
        } catch (emitError) {
          console.error(
            `Error emitting notification to user ${user._id}:`,
            emitError
          );
        }
      }

      return notification;
    });

    // Wait for all notifications to be created
    const notifications = await Promise.all(notificationPromises);

    // Filter out null values
    const validNotifications = notifications.filter((n) => n !== null);

    console.log(
      `Created ${validNotifications.length} notifications for new post in ${post.stateName}`
    );

    return validNotifications;
  } catch (error) {
    console.error("Error creating notifications for favorite location:", error);
    throw error;
  }
};

module.exports = {
  createNotificationsForFavoriteLocation,
  createNotificationsForFavoriteLocationEnhanced,
};
