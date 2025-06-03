import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const useLocationHistory = (locationName) => {
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      // Reset states
      setHistory(null);
      setError(null);

      // Debug log
      console.log("Fetching history for location:", locationName);
      console.log("API Base URL:", API_BASE_URL);

      // Validate locationName
      if (
        !locationName ||
        typeof locationName !== "string" ||
        !locationName.trim()
      ) {
        console.log("Invalid location name:", locationName);
        setError("Invalid location name");
        return;
      }

      setIsLoading(true);

      try {
        const sanitizedLocation = locationName.trim();
        const url = `${API_BASE_URL}/api/history/${encodeURIComponent(sanitizedLocation)}`;
        console.log("Making request to:", url);
        
        const response = await axios.get(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log("History API response:", response.data);

        if (response.data.status === "success") {
          setHistory(response.data.data.history);
        } else {
          console.log("No history data in response:", response.data);
          setError("No history data available");
        }
      } catch (err) {
        console.error("Error fetching history:", err);
        console.error("Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        });
        
        // Check if the response is HTML instead of JSON
        if (err.response?.data && typeof err.response.data === 'string' && err.response.data.includes('<!doctype html>')) {
          setError("API endpoint not found. Please check the server configuration.");
        } else {
          setError(
            err.response?.data?.message ||
            "Failed to fetch history. Please try again later."
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [locationName]);

  return { history, isLoading, error };
};
