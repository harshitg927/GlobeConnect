const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary = require("../utils/cloudinary");
const {
  buildQueryFilters,
  buildSearchConditions,
  buildSortOptions,
  buildFieldSelection,
  buildPagination,
} = require("../utils/queryHelpers");

// @desc    Get all posts with admin privileges (additional filtering options)
// @route   GET /api/admin/posts
// @access  Private (Admin only)
exports.getAllPosts = async (req, res, next) => {
  try {
    // Build query filters
    const filters = buildQueryFilters(req.query);

    // Build search conditions
    const searchConditions = buildSearchConditions(req.query.search);

    // Combine filters and search conditions
    const queryConditions = { ...filters, ...searchConditions };

    // Build sort options
    const sortOptions = buildSortOptions(req.query.sort);

    // Build field selection
    const fieldSelection = buildFieldSelection(req.query.fields);

    // Build pagination
    const { skip, limit } = buildPagination(req.query.page, req.query.limit);

    // Execute the query with all options
    const posts = await Post.find(queryConditions)
      .populate([
        {
          path: "author",
          select: "username email",
        },
        {
          path: "comments.user",
          select: "username",
        },
      ])
      .sort(sortOptions)
      .select(fieldSelection)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(queryConditions);

    // Send response
    res.status(200).json({
      status: "success",
      results: posts.length,
      total: totalPosts,
      data: {
        posts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete any post (admin privilege)
// @route   DELETE /api/admin/posts/:id
// @access  Private (Admin only)
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Delete images from Cloudinary
    if (post.images && post.images.length > 0) {
      for (const imageUrl of post.images) {
        const publicId = cloudinary.getPublicIdFromUrl(imageUrl);
        await cloudinary.deleteImage(publicId);
      }
    }

    // Delete the post
    await Post.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete any comment (admin privilege)
// @route   DELETE /api/admin/comments/:commentId
// @access  Private (Admin only)
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    // Find post that contains the comment
    const post = await Post.findOne({ "comments._id": commentId });

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No comment found with that ID",
      });
    }

    // Remove the comment
    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== commentId,
    );

    await post.save();

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Private (Admin only)
exports.getStatistics = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();

    const totalComments = await Post.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: { $size: "$comments" } },
        },
      },
    ]);

    const commentCount = totalComments.length > 0 ? totalComments[0].count : 0;

    const totalLikes = await Post.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: { $size: "$likes" } },
        },
      },
    ]);

    const likeCount = totalLikes.length > 0 ? totalLikes[0].count : 0;

    res.status(200).json({
      status: "success",
      data: {
        statistics: {
          userCount,
          postCount,
          commentCount,
          likeCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a super-admin user (only to be used once)
// @route   POST /api/admin/create-admin
// @access  Private (only via direct database or already admin)
exports.createAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if there's already a super-admin
    const existingAdmin = await User.findOne({ role: "super-admin" });
    if (existingAdmin && !req.user?.role === "super-admin") {
      return res.status(403).json({
        status: "fail",
        message: "Super-admin already exists",
      });
    }

    // Create super-admin user
    const admin = await User.create({
      username,
      email,
      password,
      role: "super-admin",
    });

    // Remove password from output
    admin.password = undefined;

    res.status(201).json({
      status: "success",
      data: {
        admin,
      },
    });
  } catch (error) {
    next(error);
  }
};
