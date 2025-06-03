const User = require("../models/User");

// @desc    Add location to favorites
// @route   POST /api/favorites
// @access  Private
exports.addFavorite = async (req, res, next) => {
  try {
    const { latitude, longitude, city, state, country, displayName } = req.body;

    // Validate required fields
    if (!latitude || !longitude || !state) {
      return res.status(400).json({
        status: "fail",
        message: "Latitude, longitude, and state are required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Check if state is already in favorites (case-insensitive)
    const existingFavorite = user.favorites.find(
      (fav) => fav.state && fav.state.toLowerCase() === state.toLowerCase(),
    );

    if (existingFavorite) {
      return res.status(400).json({
        status: "fail",
        message: "This state is already in your favorites",
      });
    }

    // Add to favorites
    user.favorites.push({
      latitude,
      longitude,
      city,
      state,
      country,
      displayName,
    });

    await user.save();

    res.status(201).json({
      status: "success",
      message: "State added to favorites",
      data: {
        favorite: user.favorites[user.favorites.length - 1],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove location from favorites
// @route   DELETE /api/favorites/:id
// @access  Private
exports.removeFavorite = async (req, res, next) => {
  try {
    const favoriteId = req.params.id;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Find and remove the favorite
    const favoriteIndex = user.favorites.findIndex(
      (fav) => fav._id.toString() === favoriteId,
    );

    if (favoriteIndex === -1) {
      return res.status(404).json({
        status: "fail",
        message: "Favorite not found",
      });
    }

    user.favorites.splice(favoriteIndex, 1);
    await user.save();

    res.status(200).json({
      status: "success",
      message: "State removed from favorites",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user favorites
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      results: user.favorites.length,
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if location is in favorites (by coordinates - for backward compatibility)
// @route   GET /api/favorites/check/:lat/:lng
// @access  Private
exports.checkFavorite = async (req, res, next) => {
  try {
    const { lat, lng } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid coordinates",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // For coordinate-based checking, we need to get the state from coordinates
    // This will be handled by the frontend by first getting location info and then checking by state
    // For now, return false to maintain backward compatibility
    res.status(200).json({
      status: "success",
      data: {
        isFavorite: false,
        favorite: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if state is in favorites
// @route   GET /api/favorites/check-state/:stateName
// @access  Private
exports.checkFavoriteByState = async (req, res, next) => {
  try {
    const { stateName } = req.params;

    if (!stateName) {
      return res.status(400).json({
        status: "fail",
        message: "State name is required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Check if state is in favorites (case-insensitive)
    const favorite = user.favorites.find(
      (fav) => fav.state && fav.state.toLowerCase() === stateName.toLowerCase(),
    );

    res.status(200).json({
      status: "success",
      data: {
        isFavorite: !!favorite,
        favorite: favorite || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
