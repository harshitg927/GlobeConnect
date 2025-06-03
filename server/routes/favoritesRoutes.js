const express = require("express");
const router = express.Router();
const favoritesController = require("../controllers/favoritesController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected (require authentication)
router.use(protect);

// Favorites routes
router
  .route("/")
  .get(favoritesController.getFavorites)
  .post(favoritesController.addFavorite);

router.route("/:id").delete(favoritesController.removeFavorite);

router.route("/check/:lat/:lng").get(favoritesController.checkFavorite);

// New route for checking favorites by state
router
  .route("/check-state/:stateName")
  .get(favoritesController.checkFavoriteByState);

module.exports = router;
