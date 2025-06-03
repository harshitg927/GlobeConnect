const Post = require("../models/Post");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");
const path = require("path");
const {
  createNotificationsForFavoriteLocationEnhanced,
} = require("../services/notificationService");
const {
  buildQueryFilters,
  buildSearchConditions,
  buildSortOptions,
  buildFieldSelection,
  buildPagination,
} = require("../utils/queryHelpers");

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { title, description, stateName } = req.body;

    // Check for required fields
    if (!title || !description || !stateName) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide title, description, and state name",
      });
    }

    // Handle image uploads if any
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Upload each image to Cloudinary
      const uploadPromises = req.files.map(async (file) => {
        const result = await cloudinary.uploadImage(file.path);
        // Clean up the file from local storage after upload
        fs.unlinkSync(file.path);
        return result;
      });

      imageUrls = await Promise.all(uploadPromises);
    }

    // Create post
    const post = await Post.create({
      title,
      description,
      stateName,
      images: imageUrls,
      author: req.user._id,
    });

    // Create notifications for users who have this location in their favorites
    try {
      const io = req.app.get("io");
      await createNotificationsForFavoriteLocationEnhanced(post, io);
    } catch (notificationError) {
      console.error("Error creating notifications:", notificationError);
      // Don't fail the post creation if notifications fail
    }

    res.status(201).json({
      status: "success",
      data: {
        post,
      },
    });
  } catch (error) {
    // Clean up any uploaded files if there's an error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
};

// @desc    Get all posts with pagination, filtering, and sorting
// @route   GET /api/posts
// @access  Public
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
      .populate({
        path: "author",
        select: "username",
      })
      .populate({
        path: "comments.user",
        select: "username",
      })
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

// @desc    Get current user's posts
// @route   GET /api/posts/user
// @access  Private
exports.getCurrentUserPosts = async (req, res, next) => {
  try {
    // Build sort options
    const sortOptions = buildSortOptions(req.query.sort);

    // Build field selection
    const fieldSelection = buildFieldSelection(req.query.fields);

    // Build pagination
    const { skip, limit } = buildPagination(req.query.page, req.query.limit);

    const posts = await Post.find({ author: req.user._id })
      .populate({
        path: "author",
        select: "username email",
      })
      .populate({
        path: "comments.user",
        select: "username",
      })
      .sort(sortOptions)
      .select(fieldSelection)
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalPosts = await Post.countDocuments({ author: req.user._id });

    res.status(200).json({
      status: "success",
      results: posts.length,
      total: totalPosts,
      posts: posts, // Frontend expects 'posts' directly
    });
  } catch (error) {
    console.error("Error fetching current user posts:", error);
    next(error);
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
// @access  Public
exports.getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "author",
        select: "username",
      })
      .populate({
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
      data: {
        post,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private (own post only)
exports.updatePost = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    // Find the post
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Check if user is the author of the post
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to update this post",
      });
    }

    // Handle new image uploads if any
    let newImageUrls = [...post.images]; // Start with existing images
    if (req.files && req.files.length > 0) {
      // Upload each new image to Cloudinary
      const uploadPromises = req.files.map(async (file) => {
        const result = await cloudinary.uploadImage(file.path);
        fs.unlinkSync(file.path); // Clean up local file
        return result;
      });

      const uploadedImages = await Promise.all(uploadPromises);
      newImageUrls = [...newImageUrls, ...uploadedImages];
    }

    // Handle image deletions if specified
    if (req.body.deleteImages && Array.isArray(req.body.deleteImages)) {
      // Get the URLs of images to delete
      const imagesToDelete = req.body.deleteImages;

      // Delete from Cloudinary
      for (const imageUrl of imagesToDelete) {
        if (post.images.includes(imageUrl)) {
          const publicId = cloudinary.getPublicIdFromUrl(imageUrl);
          await cloudinary.deleteImage(publicId);
        }
      }

      // Filter out deleted images from the array
      newImageUrls = newImageUrls.filter(
        (url) => !imagesToDelete.includes(url),
      );
    }

    // Update the post
    post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title: title || post.title,
        description: description || post.description,
        images: newImageUrls,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: true,
      },
    ).populate({
      path: "author",
      select: "username",
    });

    res.status(200).json({
      status: "success",
      data: {
        post,
      },
    });
  } catch (error) {
    // Clean up any uploaded files if there's an error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (own post only)
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "No post found with that ID",
      });
    }

    // Check if user is the author of the post
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this post",
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

// @desc    Get posts by state name
// @route   GET /api/posts/state/:stateName
// @access  Public
exports.getPostsByState = async (req, res, next) => {
  try {
    const { stateName } = req.params;

    // Build base query condition for state name
    const baseCondition = { stateName: { $regex: new RegExp(stateName, "i") } };

    // Build sort options
    const sortOptions = buildSortOptions(req.query.sort);

    // Build field selection
    const fieldSelection = buildFieldSelection(req.query.fields);

    // Build pagination
    const { skip, limit } = buildPagination(req.query.page, req.query.limit);

    const posts = await Post.find(baseCondition)
      .populate({
        path: "author",
        select: "username",
      })
      .populate({
        path: "comments.user",
        select: "username",
      })
      .sort(sortOptions)
      .select(fieldSelection)
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalPosts = await Post.countDocuments(baseCondition);

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

// @desc    Get posts by user
// @route   GET /api/posts/user/:userId
// @access  Public
exports.getPostsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Build base query condition for user
    const baseCondition = { author: userId };

    // Build sort options
    const sortOptions = buildSortOptions(req.query.sort);

    // Build field selection
    const fieldSelection = buildFieldSelection(req.query.fields);

    // Build pagination
    const { skip, limit } = buildPagination(req.query.page, req.query.limit);

    const posts = await Post.find(baseCondition)
      .populate({
        path: "author",
        select: "username",
      })
      .populate({
        path: "comments.user",
        select: "username",
      })
      .sort(sortOptions)
      .select(fieldSelection)
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalPosts = await Post.countDocuments(baseCondition);

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
