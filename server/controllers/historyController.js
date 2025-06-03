const axios = require("axios");
const History = require("../models/History");

// @desc    Get historical information about a state
// @route   GET /api/history/:stateName
// @access  Public
exports.getStateHistory = async (req, res, next) => {
  try {
    const { locationName } = req.params;

    // Sanitize and validate location name
    if (!locationName || locationName.trim().length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid location name",
      });
    }

    const sanitizedLocationName = decodeURIComponent(locationName).trim();

    // Check if data exists in cache
    const cachedData = await History.findOne({
      stateName: { $regex: new RegExp(`^${sanitizedLocationName}$`, "i") },
    });

    if (cachedData) {
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: {
          history: cachedData.data,
        },
      });
    }

    // If not in cache, fetch from external APIs
    let historyData;
    let source;

    try {
      // Try Wikipedia API first
      const wikiSearchResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          sanitizedLocationName,
        )}&format=json&origin=*`,
      );

      if (wikiSearchResponse.data.query.search.length > 0) {
        const pageTitle = wikiSearchResponse.data.query.search[0].title;
        const wikiResponse = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            pageTitle,
          )}`,
        );

        if (wikiResponse.data && wikiResponse.data.extract) {
          historyData = {
            title: wikiResponse.data.title,
            extract: wikiResponse.data.extract,
            thumbnail: wikiResponse.data.thumbnail?.source || null,
            url: wikiResponse.data.content_urls?.desktop?.page || null,
          };
          source = "wikipedia";
        }
      }
    } catch (error) {
      console.log("Wikipedia API error:", error.message);
      // Try RESTCountries API as fallback
      try {
        const countryResponse = await axios.get(
          `https://restcountries.com/v3.1/name/${encodeURIComponent(
            sanitizedLocationName,
          )}`,
        );

        if (countryResponse.data && countryResponse.data.length > 0) {
          const country = countryResponse.data[0];
          historyData = {
            name: country.name.common,
            officialName: country.name.official,
            capital: country.capital?.[0] || "N/A",
            region: country.region,
            subregion: country.subregion,
            population: country.population,
            languages: country.languages,
            currencies: country.currencies,
            flag: country.flags?.png || null,
            maps: country.maps?.googleMaps || null,
          };
          source = "restcountries";
        }
      } catch (countryError) {
        console.log("RESTCountries API error:", countryError.message);
      }
    }

    // If both APIs failed
    if (!historyData) {
      return res.status(404).json({
        status: "fail",
        message: `No historical information found for ${sanitizedLocationName}`,
      });
    }

    // Save to cache
    await History.create({
      stateName: sanitizedLocationName,
      data: historyData,
      source,
    });

    res.status(200).json({
      status: "success",
      source: "api",
      data: {
        history: historyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear history cache for a state
// @route   DELETE /api/history/:stateName
// @access  Private (Admin only)
exports.clearHistoryCache = async (req, res, next) => {
  try {
    const { stateName } = req.params;

    const result = await History.deleteOne({
      stateName: { $regex: new RegExp(`^${stateName}$`, "i") },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: `No cached history found for ${stateName}`,
      });
    }

    res.status(200).json({
      status: "success",
      message: `Cache cleared for ${stateName}`,
    });
  } catch (error) {
    next(error);
  }
};
