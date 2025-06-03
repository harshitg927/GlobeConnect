// Utility functions for reverse geocoding using OpenStreetMap Nominatim API

/**
 * Fetches location details from OpenStreetMap Nominatim API using coordinates
 * @param {Object} coordinates - Object containing latitude and longitude
 * @returns {Promise<Object>} Location details including city, state, country
 */
const getLocationFromCoordinates = async (coordinates) => {
  try {
    const { latitude, longitude } = coordinates;
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "3DGlobeSearch", // Required by Nominatim Usage Policy
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch location data");
    }

    const data = await response.json();

    return {
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.suburb,
      state: data.address?.state,
      country: data.address?.country,
      countryCode: data.address?.country_code?.toUpperCase(),
      displayName: data.display_name,
      raw: data, // Include raw data for additional details if needed
    };
  } catch (error) {
    console.error("Error fetching location:", error);
    return null;
  }
};

export { getLocationFromCoordinates };
