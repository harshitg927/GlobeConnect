// Helper function to build query filters
const buildQueryFilters = (queryString) => {
  const queryObj = { ...queryString };
  const excludedFields = ["page", "sort", "limit", "fields", "search"];
  excludedFields.forEach((field) => delete queryObj[field]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  return JSON.parse(queryStr);
};

// Helper function to build search conditions
const buildSearchConditions = (searchTerm) => {
  if (!searchTerm) return {};

  const searchTerms = searchTerm.split(",").map((term) => term.trim());

  if (searchTerms.length === 0) return {};

  // Create OR conditions for search across multiple fields
  const searchConditions = searchTerms.map((term) => ({
    $or: [
      { title: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
      { stateName: { $regex: term, $options: "i" } },
    ],
  }));

  // Add search to query with AND between terms
  return { $and: searchConditions };
};

// Helper function to build sort options
const buildSortOptions = (sortParam) => {
  if (sortParam) {
    const sortBy = sortParam.split(",").join(" ");
    return sortBy;
  } else {
    // Default sort by most recent
    return "-createdAt";
  }
};

// Helper function to build field selection
const buildFieldSelection = (fieldsParam) => {
  if (fieldsParam) {
    return fieldsParam.split(",").join(" ");
  } else {
    // Exclude internal fields
    return "-__v";
  }
};

// Helper function to build pagination
const buildPagination = (pageParam, limitParam) => {
  const page = parseInt(pageParam, 10) || 1;
  const limit = parseInt(limitParam, 10) || 10;
  const skip = (page - 1) * limit;

  return { skip, limit };
};

module.exports = {
  buildQueryFilters,
  buildSearchConditions,
  buildSortOptions,
  buildFieldSelection,
  buildPagination,
};
