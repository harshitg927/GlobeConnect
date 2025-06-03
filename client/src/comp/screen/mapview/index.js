import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import {
  Box,
  Flex,
  IconButton,
  Tooltip,
  Text,
  useColorMode,
} from "@chakra-ui/react";
import { AddIcon, MinusIcon, SearchIcon } from "@chakra-ui/icons";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import Actions from "../../redux/action";
import Constants from "../../utils/Constants";
import "./index.css";
import "./geosearch.css";
import lodash from "lodash";
import { useNavigate } from "react-router-dom";
import { getLocationFromCoordinates } from "../../utils/geocoding";

// Fix for Leaflet marker icon issue in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const { MasterDrawerMenuType } = Constants;

const MapView = (props) => {
  const { userConfig, userPref } = props;
  const navigate = useNavigate();
  const { colorMode } = useColorMode();

  const [state, setState] = useState({
    selectedMenuType:
      userConfig?.selectedMenuType ?? MasterDrawerMenuType.Search,
    isMapLoaded: false,
    zoomLevel: 3,
    popupContent: null,
    showPopup: false,
  });

  const updateState = (data) =>
    setState((preState) => ({ ...preState, ...data }));

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  /*  Life-cycles Methods */

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (state.isMapLoaded) {
      let selectedMenuType = state?.selectedMenuType;
      let selectedPlaceItem = userConfig?.selectedPlaceItem;
      let selectedInputCoordinate = userConfig?.selectedInputCoordinate;
      let selectedPlaceCoordinate = userConfig?.selectedPlaceCoordinate;

      if (selectedMenuType !== userConfig?.selectedMenuType) {
        updateState({
          selectedMenuType: userConfig?.selectedMenuType,
        });
      }

      // Handle place selection priority
      if (!lodash.isNil(selectedInputCoordinate)) {
        // Input coordinates take highest priority
        showCoordinate(selectedInputCoordinate);
      } else if (!lodash.isNil(selectedPlaceItem)) {
        // Then place items (from search results)
        showPlaceItem(selectedPlaceItem);
      } else if (!lodash.isNil(selectedPlaceCoordinate)) {
        // Then place coordinates (from clicks or other sources)
        showCoordinate(selectedPlaceCoordinate);
      }
    }
  }, [userConfig]);

  /*  Public Interface Methods */

  const initMap = () => {
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Initialize the map
    const map = L.map(mapContainerRef.current).setView([20, 0], 2);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add GeoSearch control
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider: provider,
      style: "bar",
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: "Enter address or coordinates",
    });

    map.addControl(searchControl);

    // Handle GeoSearch result selection
    map.on("geosearch/showlocation", async (e) => {
      const { x: lng, y: lat } = e.location;
      const selectedPlaceCoordinate = { latitude: lat, longitude: lng };

      // Get location details from coordinates
      const locationDetails = await getLocationFromCoordinates(
        selectedPlaceCoordinate,
      );

      // Create a place item from the search result
      if (locationDetails) {
        const placeItem = {
          ...selectedPlaceCoordinate,
          name: e.location.label,
          address: e.location.label,
          country: locationDetails.country,
          countryCode: locationDetails.countryCode,
          state: locationDetails.state,
          city: locationDetails.city,
        };

        props.setUserConfig({
          ...userConfig,
          selectedInputCoordinate: null,
          selectedPlaceCoordinate: null,
          selectedPlaceItem: placeItem,
          isPlaceVisible: true,
        });

        showPlaceItem(placeItem);
      } else {
        // If location details couldn't be fetched, just show coordinates
        props.setUserConfig({
          ...userConfig,
          selectedInputCoordinate: null,
          selectedPlaceCoordinate: selectedPlaceCoordinate,
          isPlaceVisible: true,
        });

        showCoordinate(selectedPlaceCoordinate);
      }
    });

    // Set up event handlers
    map.on("zoom", () => {
      updateState({ zoomLevel: map.getZoom() });
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const selectedPlaceCoordinate = { latitude: lat, longitude: lng };

      props.setUserConfig({
        ...userConfig,
        selectedInputCoordinate: null,
        selectedPlaceCoordinate: selectedPlaceCoordinate,
        isPlaceVisible: true,
      });

      showCoordinate(selectedPlaceCoordinate);

      // Navigate to location details page when clicking on the map
      navigate(`/location/${lat}/${lng}`);
    });

    updateState({ isMapLoaded: true });
  };

  const showPlaceItem = (placeItem) => {
    if (!mapRef.current || !placeItem) return;

    const { latitude, longitude } = placeItem;
    const map = mapRef.current;

    // Clear existing marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Create popup content
    let popupContent = placeItem.address || "Selected Location";

    // Add more details if available
    if (placeItem.name) {
      popupContent = `<b>${placeItem.name}</b><br>${popupContent}`;
    }

    if (placeItem.country) {
      popupContent += `<br>Country: ${placeItem.country}`;
    }

    if (placeItem.state) {
      popupContent += `<br>State: ${placeItem.state}`;
    }

    if (placeItem.city) {
      popupContent += `<br>City: ${placeItem.city}`;
    }

    // Add new marker
    const marker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();

    markerRef.current = marker;

    // Center map on the marker with appropriate zoom level
    map.setView([latitude, longitude], 10);

    // Update state with popup content
    updateState({
      popupContent: popupContent,
      showPopup: true,
    });
  };

  const showCoordinate = (coordinate) => {
    if (!mapRef.current || !coordinate) return;

    const { latitude, longitude } = coordinate;
    const map = mapRef.current;

    // Clear existing marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Format coordinates for display
    const formattedLat =
      typeof latitude === "number" ? latitude.toFixed(6) : latitude;
    const formattedLng =
      typeof longitude === "number" ? longitude.toFixed(6) : longitude;

    // Create popup content with formatted coordinates
    const popupContent = `
      <div>
        <b>Coordinates</b><br>
        Latitude: ${formattedLat}<br>
        Longitude: ${formattedLng}
      </div>
    `;

    // Add new marker
    const marker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();

    markerRef.current = marker;

    // Center map on the marker with appropriate zoom level
    map.setView([latitude, longitude], 10);

    // Update state with popup content
    updateState({
      popupContent: popupContent,
      showPopup: true,
    });
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1);
    }
  };

  /*  Render Methods */

  return (
    <Flex
      position="relative"
      overflow="hidden"
      width="100%"
      height="100%"
      direction="column"
    >
      <Box
        ref={mapContainerRef}
        className="mapContainer"
        flex="1"
        width="100%"
        height="100%"
      />
      <Flex
        position="absolute"
        bottom="20px"
        right="20px"
        direction="column"
        zIndex="500"
      >
        <Tooltip label="Zoom In" placement="left">
          <IconButton
            aria-label="Zoom in"
            icon={<AddIcon />}
            onClick={handleZoomIn}
            mb="2"
          />
        </Tooltip>
        <Tooltip label="Zoom Out" placement="left">
          <IconButton
            aria-label="Zoom out"
            icon={<MinusIcon />}
            onClick={handleZoomOut}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
};

const mapStateToProps = (state) => {
  return {
    userConfig: state.userConfig,
    userPref: state.userPref,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setUserConfig: (userConfig) => dispatch(Actions.setUserConfig(userConfig)),
    setUserPref: (userPref) => dispatch(Actions.setUserPref(userPref)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MapView);
