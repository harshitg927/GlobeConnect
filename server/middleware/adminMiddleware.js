// Admin middleware to check if user has super-admin role
exports.checkAdminRole = (req, res, next) => {
  if (req.user && req.user.role === "super-admin") {
    return next();
  }

  return res.status(403).json({
    status: "fail",
    message:
      "Access denied. You do not have permission to perform this action.",
  });
};
