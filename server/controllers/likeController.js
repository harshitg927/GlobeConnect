const Post = require("../models/Post");
const User = require("../models/User");

// @desc    Toggle like on a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Check if the user has already liked the post
    const userIndex = post.likes.findIndex(
      (userId) => userId.toString() === req.user.id,
    );

    // If user already liked, remove the like; otherwise add it
    if (userIndex > -1) {
      // User already liked, so remove the like
      post.likes.splice(userIndex, 1);
      await post.save();

      // Get user info for the like notification
      const user = await User.findById(req.user.id).select("username avatar");

      // Emit socket event for real-time like update
      const io = req.app.get("io");
      if (io) {
        io.to(`post:${post._id}`).emit("like-update", {
          postId: post._id,
          likes: post.likes,
          action: "unlike",
          user: {
            id: req.user.id,
            username: user.username,
            avatar: user.avatar,
          },
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Post unliked",
        data: {
          liked: false,
          likesCount: post.likes.length,
        },
      });
    } else {
      // User has not liked, so add the like
      post.likes.push(req.user._id);
      await post.save();

      // Get user info for the like notification
      const user = await User.findById(req.user.id).select("username avatar");

      // Emit socket event for real-time like update
      const io = req.app.get("io");
      if (io) {
        io.to(`post:${post._id}`).emit("like-update", {
          postId: post._id,
          likes: post.likes,
          action: "like",
          user: {
            id: req.user.id,
            username: user.username,
            avatar: user.avatar,
          },
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Post liked",
        data: {
          liked: true,
          likesCount: post.likes.length,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get users who liked a post
// @route   GET /api/posts/:id/likes
// @access  Public
exports.getLikes = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate({
      path: "likes",
      select: "username",
    });

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    res.status(200).json({
      status: "success",
      results: post.likes.length,
      data: {
        likes: post.likes,
      },
    });
  } catch (error) {
    next(error);
  }
};
