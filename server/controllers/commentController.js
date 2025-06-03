const Post = require("../models/Post");
const User = require("../models/User");

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        status: "fail",
        message: "Comment text is required",
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Create new comment object
    const newComment = {
      user: req.user._id,
      text,
      createdAt: Date.now(),
    };

    // Add comment to post
    post.comments.push(newComment);

    // Save the post with the new comment
    await post.save();

    // Find the newly added comment to get its ID
    const addedComment = post.comments[post.comments.length - 1];

    // Populate user info for the returned comment
    const populatedPost = await Post.findById(req.params.id).populate({
      path: "comments.user",
      select: "username",
    });

    // Find the populated comment from the populated post
    const populatedComment = populatedPost.comments.find(
      (comment) => comment._id.toString() === addedComment._id.toString(),
    );

    // Emit socket event for real-time comment update
    const io = req.app.get("io");
    if (io) {
      io.to(`post:${post._id}`).emit("comment-added", {
        postId: post._id,
        comment: populatedComment,
      });
    }

    res.status(201).json({
      status: "success",
      data: {
        comment: populatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public
exports.getComments = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate({
      path: "comments.user",
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
      results: post.comments.length,
      data: {
        comments: post.comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/:id/comments/:commentId
// @access  Private (own comment or post owner)
exports.deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Find the comment
    const comment = post.comments.find(
      (comment) => comment._id.toString() === commentId,
    );

    if (!comment) {
      return res.status(404).json({
        status: "fail",
        message: "No comment found with that ID",
      });
    }

    // Check if user is authorized to delete the comment
    // (either comment owner or post owner)
    if (
      comment.user.toString() !== req.user.id &&
      post.author.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this comment",
      });
    }

    // Remove the comment
    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== commentId,
    );

    await post.save();

    // Emit socket event for real-time comment deletion
    const io = req.app.get("io");
    if (io) {
      io.to(`post:${post._id}`).emit("comment-deleted", {
        postId: post._id,
        commentId: commentId,
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

// @desc    Update a comment
// @route   PUT /api/posts/:id/comments/:commentId
// @access  Private (own comment only)
exports.updateComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        status: "fail",
        message: "Comment text is required",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Find the comment
    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === commentId,
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        status: "fail",
        message: "No comment found with that ID",
      });
    }

    // Check if user is the author of the comment
    if (post.comments[commentIndex].user.toString() !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to update this comment",
      });
    }

    // Update the comment
    post.comments[commentIndex].text = text;
    post.comments[commentIndex].createdAt = Date.now(); // Update timestamp

    await post.save();

    // Get the updated comment with populated user
    const updatedPost = await Post.findById(id).populate({
      path: "comments.user",
      select: "username",
    });

    const updatedComment = updatedPost.comments.find(
      (comment) => comment._id.toString() === commentId,
    );

    res.status(200).json({
      status: "success",
      data: {
        comment: updatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};
