const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { checkAdminRole } = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");

// Admin routes
router.get("/posts", protect, checkAdminRole, adminController.getAllPosts);
router.delete(
  "/posts/:id",
  protect,
  checkAdminRole,
  adminController.deletePost
);
router.delete(
  "/comments/:commentId",
  protect,
  checkAdminRole,
  adminController.deleteComment
);
router.get(
  "/statistics",
  protect,
  checkAdminRole,
  adminController.getStatistics
);
router.post(
  "/create-admin",
  protect,
  checkAdminRole,
  adminController.createAdmin
);

module.exports = router;
