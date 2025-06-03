const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const likeController = require("../controllers/likeController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// Post routes
router
  .route("/")
  .get(postController.getAllPosts)
  .post(protect, upload.array("images", 5), postController.createPost);

// Current user's posts route - IMPORTANT: This must be BEFORE /:id routes
router.get("/user", protect, postController.getCurrentUserPosts);

router
  .route("/:id")
  .get(postController.getPostById)
  .put(protect, upload.array("images", 5), postController.updatePost)
  .delete(protect, postController.deletePost);

// State-specific posts
router.get("/state/:stateName", postController.getPostsByState);

// User-specific posts (by userId)
router.get("/user/:userId", postController.getPostsByUser);

// Comments routes
router
  .route("/:id/comments")
  .get(commentController.getComments)
  .post(protect, commentController.addComment);

router
  .route("/:id/comments/:commentId")
  .put(protect, commentController.updateComment)
  .delete(protect, commentController.deleteComment);

// Likes routes
router.route("/:id/like").post(protect, likeController.toggleLike);
router.get("/:id/likes", likeController.getLikes);

module.exports = router;
