const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");
const { protect } = require("../middleware/authMiddleware");
const { checkAdminRole } = require("../middleware/adminMiddleware");

// Public route to get historical information about a location
router.get("/:locationName", historyController.getStateHistory);

// Admin-only route to clear cache for a state
router.delete(
  "/:stateName",
  protect,
  checkAdminRole,
  historyController.clearHistoryCache,
);

module.exports = router;
