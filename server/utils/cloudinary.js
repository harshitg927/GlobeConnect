const cloudinary = require("cloudinary").v2;
const config = require("../config/default");

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// Upload image to Cloudinary
exports.uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "global-states-explorer",
      use_filename: true,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Image upload failed");
  }
};

// Delete image from Cloudinary
exports.deleteImage = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
};

// Extract public_id from Cloudinary URL
exports.getPublicIdFromUrl = (url) => {
  const splitUrl = url.split("/");
  const filename = splitUrl[splitUrl.length - 1];
  const publicId = `global-states-explorer/${filename.split(".")[0]}`;
  return publicId;
};

module.exports = exports;
