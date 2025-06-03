import React, { Fragment, useState, useEffect, useRef } from "react";
import { Flex } from "@chakra-ui/react";
import * as topojson from "topojson-client";
import versor from "versor";
import * as d3 from "d3";
import SunCalc from "suncalc";
import "./index.css";
import { connect } from "react-redux";
import lodash from "lodash";
import Actions from "../../redux/action";
import Constants from "../../utils/Constants";
import {
  getVisibility,
  polygonContains,
  fill,
  fillCity,
  stroke,
} from "./globeutils";
import { useNavigate } from "react-router-dom";

const { MasterDrawerMenuType } = Constants;

const MasterGlobeView = (props) => {
  const { userConfig, userPref } = props;
  const navigate = useNavigate();

  const [state, setState] = useState({
    selectedMenuType:
      userConfig?.selectedMenuType ?? MasterDrawerMenuType.Search,
    isGlobeLoaded: false,
    zoomLevel: 1,
    showBoundaries: true,
    showLabels: true,
    isMobile: false,
  });

  const updateState = (data) =>
    setState((preState) => ({ ...preState, ...data }));

  const containerRef = useRef();
  const canvasRef = useRef();
  const canvasOpRef = useRef();
  const svgRef = useRef();
  const svgMarkerRef = useRef();

  const globeDataObj = useRef({});
  const elementRefObj = useRef({});
  const pathRefObj = useRef({});

  // Enhanced mobile detection
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768
    );
  };

  const suncalcOptionObj = useRef({
    tickDur: 400,
    shadowOpacity: 0.16,
    lightsOpacity: 0.7,
    sunOpacity: 0.3,
    precisionLat: 1,
    precisionLng: 10,
    mapWidth: 1100,
    mapHeight: 550,
    refreshMap: true,
    refreshMapInterval: 60000,
    bgColorLeft: "#0000ff",
    bgColorRight: "#ff00aa",
    lightsColor: "#ffff00",
  });

  const updateGlobeData = (data) =>
    (globeDataObj.current = {
      ...globeDataObj.current,
      ...data,
    });

  const updateElementRef = (data) =>
    (elementRefObj.current = {
      ...elementRefObj.current,
      ...data,
    });

  const updatePathRef = (data) =>
    (pathRefObj.current = {
      ...pathRefObj.current,
      ...data,
    });

  // Enhanced pointer event handler for mobile compatibility
  const getPointerPosition = (event, element) => {
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      // Touch end event
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      // Mouse event
      return d3.pointer(event, element);
    }

    const rect = element.getBoundingClientRect();
    return [clientX - rect.left, clientY - rect.top];
  };

  /*  Life-cycles Methods */
  useEffect(() => {
    // Detect mobile device
    updateState({ isMobile: isMobileDevice() });

    // Add viewport meta tag for mobile if not present
    if (isMobileDevice() && !document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content =
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.getElementsByTagName("head")[0].appendChild(viewport);
    }

    initData();
    return () => {
      // Cleanup event listeners
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (globeDataObj.current.isLoadedMap) {
      updateGlobeData({
        enableDayNightMode: userPref?.appSettings?.enableDayNightMode ?? true,
      });
      window.requestAnimationFrame(render);
    }
  }, [userPref?.appSettings]);

  useEffect(() => {
    if (state?.isGlobeLoaded) {
      let selectedMenuType = state?.selectedMenuType;
      let selectedPlaceItem = userConfig?.selectedPlaceItem;
      let selectedInputCoordinate = userConfig?.selectedInputCoordinate;

      if (selectedMenuType !== userConfig?.selectedMenuType) {
        updateState({
          selectedMenuType: userConfig?.selectedMenuType,
        });
      }

      if (!lodash.isNil(selectedInputCoordinate)) {
        moveMarkerToFindCountryByLatLong(selectedInputCoordinate);
      }

      if (!lodash.isNil(selectedPlaceItem)) {
        showPlaceItem(selectedPlaceItem);
      }
    }
  }, [userConfig]);

  // Enhanced resize handler
  const handleResize = lodash.debounce(() => {
    updateState({ isMobile: isMobileDevice() });
    initDomElements();
    scale();
  }, 250);

  /*  Public Interface Methods */
  const initData = () => {
    clearDomElements();

    let { svg, svgMarker } = globeDataObj.current;

    if (!svg) {
      updateGlobeData({
        svg: d3.select(svgRef.current),
      });
    }

    if (!svgMarker) {
      updateGlobeData({
        svgMarker: d3.select(svgMarkerRef.current),
      });
    }

    const isMobile = isMobileDevice();

    // Enhanced zoom configuration for mobile
    const zoomConfig = isMobile
      ? { scaleExtent: [0.3, 4], duration: 300 }
      : { scaleExtent: [0.5, 8], duration: 200 };

    globeDataObj.current = {
      ...globeDataObj.current,
      scaleFactor: isMobile ? 0.7 : 0.9,
      minZoom: zoomConfig.scaleExtent[0],
      maxZoom: zoomConfig.scaleExtent[1],
      isMobile: isMobile,
      water: {
        type: "Sphere",
      },
      angles: {
        x: -20,
        y: 40,
        z: 0,
      },
      v0: null,
      r0: null,
      q0: null,
      width: containerRef.current?.offsetWidth,
      height: containerRef.current?.offsetHeight,
      currentCountry: null,
      textGroup: null,
      graticuleGroup: null,
      markerGroup: null,
      landGroup: null,
      dayNightGroup: null,
      cityGroup: null,
      isLoadedMap: false,
      enableDayNightMode: userPref?.appSettings?.enableDayNightMode ?? true,
      isDragStop: true,
      markerArray: [
        {
          id: "mark1",
          lat: 0.0,
          long: 0.0,
        },
      ],
      markerLineArray: [],
      markerPolygonArray: [],
      markerSize: isMobile ? 24 : 32,
      selectedMarkerID: null,
      transform: d3.zoomIdentity,
      colorWater: "#359faf",
      colorLand: "#006400",
      colorGraticule: "#ffff00",
      colorCountry: "#00ffff88",
      colorPolygon: "#ff880088",
      colorBoundaries: "#00000088",
      colorLabels: "#ffffff",
      selectedCounytryID: null,
      userCountryID: null,
      canvas: d3.select(canvasRef.current),
      canvasOp: d3.select(canvasOpRef.current),

      // Touch tracking for mobile
      lastTouchDistance: 0,
      touchStartTime: 0,
      isMultiTouch: false,
    };

    const { canvas, canvasOp, width, height } = globeDataObj.current;

    elementRefObj.current = {
      context: canvas.node().getContext("2d"),
      contextOp: canvasOp.node().getContext("2d"),
      projection: d3.geoOrthographic().precision(0.1).clipAngle(90),
      graticule: d3.geoGraticule10(),
    };

    const { projection, context, contextOp } = elementRefObj.current;

    pathRefObj.current = {
      path: d3.geoPath(projection).context(context),
      tempPath: d3.geoPath(projection),
      pathOp: d3.geoPath(projection).context(contextOp),
      geoCircle: d3.geoCircle(),
    };

    loadData((world, countryList, cities) => {
      let land = topojson.feature(world, world?.objects?.land);
      let countries = topojson.feature(world, world?.objects?.countries);

      let names = {};
      countryList.forEach((d, i) => {
        names[d["country-code"]] = d.name;
      });

      updateGlobeData({
        land: land,
        countries: countries,
        cities: cities,
        countryList: countryList,
        names: names,
      });

      window.addEventListener("resize", handleResize);
      initDomElements();
      scale();
    });

    setAngles();
    setupCanvasEvents();
  };

  // Enhanced canvas event setup with mobile support
  const setupCanvasEvents = () => {
    const { canvas, width, height, isMobile } = globeDataObj.current;
    const canvasNode = canvas.node();

    // Remove existing listeners
    canvas.on(".drag", null);
    canvas.on(".zoom", null);
    canvas.on("click", null);
    canvas.on("mousemove", null);

    if (isMobile) {
      // Mobile touch events
      canvasNode.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      canvasNode.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      canvasNode.addEventListener("touchend", handleTouchEnd, {
        passive: false,
      });
      canvasNode.addEventListener("click", handleClick, { passive: true });

      // Prevent default touch behaviors
      canvasNode.style.touchAction = "none";
    } else {
      // Desktop mouse events
      canvas
        .call(
          d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
        .on("click", mouseClicked)
        .on("mousemove", mousemove)
        .call(
          d3
            .zoom()
            .scaleExtent([0.8, 8])
            .translateExtent([
              [0, 0],
              [width, height],
            ])
            .on("zoom", handleZoom)
        );
    }
  };

  // Enhanced touch event handlers
  const handleTouchStart = (event) => {
    event.preventDefault();

    const { canvas } = globeDataObj.current;
    const touches = event.touches;

    updateGlobeData({
      touchStartTime: Date.now(),
      isMultiTouch: touches.length > 1,
    });

    if (touches.length === 1) {
      // Single touch - start drag
      const { projection } = elementRefObj.current;
      const pointer = getPointerPosition(event, canvas.node());
      const v0 = versor.cartesian(projection.invert(pointer));
      const r0 = projection.rotate();
      const q0 = versor(r0);

      updateGlobeData({
        v0: v0,
        r0: r0,
        q0: q0,
      });
    } else if (touches.length === 2) {
      // Multi-touch - prepare for zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      updateGlobeData({
        lastTouchDistance: distance,
      });
    }
  };

  const handleTouchMove = (event) => {
    event.preventDefault();

    const { canvas, v0, r0, q0, lastTouchDistance, isMultiTouch } =
      globeDataObj.current;
    const { projection } = elementRefObj.current;
    const touches = event.touches;

    if (touches.length === 1 && !isMultiTouch) {
      // Single touch drag
      if (v0 && r0 && q0) {
        const pointer = getPointerPosition(event, canvas.node());
        const v1 = versor.cartesian(projection.rotate(r0).invert(pointer));
        const q1 = versor.multiply(q0, versor.delta(v0, v1));
        const r1 = versor.rotation(q1);
        r1[2] = 0; // Prevent roll

        projection.rotate(r1);
        updateElementRef({ projection: projection });
        window.requestAnimationFrame(render);
      }
    } else if (touches.length === 2) {
      // Multi-touch zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (lastTouchDistance > 0) {
        const scaleRatio = currentDistance / lastTouchDistance;
        const { scaleFactor, minZoom, maxZoom } = globeDataObj.current;
        const newScale = Math.min(
          Math.max(scaleFactor * scaleRatio, minZoom),
          maxZoom
        );

        updateGlobeData({
          scaleFactor: newScale,
          lastTouchDistance: currentDistance,
        });

        scale();
      } else {
        // Initialize lastTouchDistance for subsequent moves
        updateGlobeData({
          lastTouchDistance: currentDistance,
        });
      }
    }
  };

  const handleTouchEnd = (event) => {
    event.preventDefault();

    const { touchStartTime, isMultiTouch } = globeDataObj.current;
    const touchDuration = Date.now() - touchStartTime;

    // Reset touch state
    updateGlobeData({
      v0: null,
      r0: null,
      q0: null,
      lastTouchDistance: 0,
      isMultiTouch: false,
    });

    // Handle tap (short touch on single finger)
    if (
      !isMultiTouch &&
      touchDuration < 300 &&
      event.changedTouches.length === 1
    ) {
      setTimeout(() => {
        handleClick(event);
      }, 50); // Small delay to prevent conflicts
    }
  };

  const handleClick = (event) => {
    const { canvas } = globeDataObj.current;

    // For touch events, we need to ensure proper event handling
    let processedEvent = event;

    // If this is a touch event, create a more compatible event object
    if (event.changedTouches && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      processedEvent = {
        ...event,
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: canvas.node(),
        currentTarget: canvas.node(),
      };
    } else {
      // Create a synthetic event object for compatibility
      processedEvent = {
        ...event,
        target: canvas.node(),
        currentTarget: canvas.node(),
      };
    }

    addClickedMarkerToFindCountry(processedEvent);
  };

  // Enhanced zoom handler
  const handleZoom = (event) => {
    let { scaleFactor } = globeDataObj.current;
    scaleFactor = event.transform.k;

    updateGlobeData({
      transform: event.transform,
      scaleFactor: scaleFactor,
    });

    scale();
  };

  const setAngles = () => {
    let { angles } = globeDataObj.current;
    let { projection } = elementRefObj.current;

    let rotation = projection.rotate();
    rotation[0] = angles.y;
    rotation[1] = angles.x;
    rotation[2] = angles.z;
    projection.rotate(rotation);

    updateGlobeData({
      angles: angles,
    });

    updateElementRef({
      projection: projection,
    });
  };

  const isDaylight = (obj) => {
    return obj.altitude > 0;
  };

  const isNorthSun = () => {
    return isDaylight(SunCalc.getPosition(new Date(), 90, 0));
  };

  const getAllSunriseSunsetCoords = (northSun) => {
    const { precisionLng } = suncalcOptionObj.current;

    let lng = -180;
    let coords = [];
    while (lng <= 180) {
      coords.push([lng, getSunriseSunsetLatitude(lng, northSun)]);
      lng += precisionLng;
    }
    return coords;
  };

  const getSunriseSunsetLatitude = (lng, northSun) => {
    const { precisionLat } = suncalcOptionObj.current;

    let delta, endLat, lat, startLat;
    if (northSun) {
      startLat = -90;
      endLat = 90;
      delta = precisionLat;
    } else {
      startLat = 90;
      endLat = -90;
      delta = -precisionLat;
    }
    lat = startLat;

    while (lat !== endLat) {
      if (isDaylight(SunCalc.getPosition(new Date(), lat, lng))) {
        return lat;
      }
      lat += delta;
    }
    return lat;
  };

  const getPath = (northSun) => {
    const coords = getAllSunriseSunsetCoords(northSun);
    return coords;
  };

  const getPathString = (northSun) => {
    let path = getPath(northSun);

    let geoJsonObj = {
      type: "Feature",
      properties: {
        name: "DayNightPath",
      },
      geometry: {
        type: "Polygon",
        coordinates: [path],
      },
    };

    return geoJsonObj;
  };

  const clearDomElements = () => {
    let { svg, svgMarker } = globeDataObj.current;

    if (svgMarker) {
      svgMarker.selectAll("#graticule").remove();
      svgMarker.selectAll("#land").remove();
      svgMarker.selectAll("#text").remove();
      svgMarker.selectAll("#image").remove();
    }

    updateGlobeData({
      svg: svg,
      svgMarker: svgMarker,
      graticuleGroup: null,
      landGroup: null,
      textGroup: null,
      markerGroup: null,
      dayNightGroup: null,
      cityGroup: null,
      markerArray: [],
      markerLineArray: [],
      markerPolygonArray: [],
      selectedMarkerID: null,
      selectedCounytryID: null,
      userCountryID: null,
      canvas: null,
      canvasOp: null,
    });
  };

  const initDomElements = () => {
    let {
      width,
      height,
      canvas,
      canvasOp,
      svg,
      svgMarker,
      graticuleGroup,
      colorGraticule,
      landGroup,
      textGroup,
      markerGroup,
      dayNightGroup,
      cityGroup,
      countries,
      names,
      isMobile,
    } = globeDataObj.current;

    let { projection, graticule } = elementRefObj.current;
    let { path } = pathRefObj.current;

    width = containerRef.current?.offsetWidth;
    height = containerRef.current?.offsetHeight;

    // Enhanced canvas setup for mobile
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = width * (isMobile ? 1 : pixelRatio);
    const canvasHeight = height * (isMobile ? 1 : pixelRatio);

    canvas.attr("width", canvasWidth).attr("height", canvasHeight);
    canvasOp.attr("width", canvasWidth).attr("height", canvasHeight);

    // Scale context for high DPI displays (but not on mobile to save performance)
    if (!isMobile && pixelRatio > 1) {
      const context = canvas.node().getContext("2d");
      const contextOp = canvasOp.node().getContext("2d");
      context.scale(pixelRatio, pixelRatio);
      contextOp.scale(pixelRatio, pixelRatio);
    }

    canvas.style("width", width + "px").style("height", height + "px");
    canvasOp.style("width", width + "px").style("height", height + "px");

    projection.fitSize([width, height]).translate([width / 2, height / 2]);

    svg.attr("width", width).attr("height", height);
    svgMarker.attr("width", width).attr("height", height);

    updateGlobeData({
      width: width,
      height: height,
      canvas: canvas,
      canvasOp: canvasOp,
      svg: svg,
      svgMarker: svgMarker,
    });

    // Rest of the DOM initialization remains the same...
    svgMarker.selectAll("#maskPath").remove();

    let mask = svgMarker.append("clipPath");
    mask.attr("id", "maskPath");
    mask.html(`<rect width="${width}" height="${height}" x="0" y="0" />`);

    if (!graticuleGroup) {
      graticuleGroup = svg
        .append("g")
        .attr("id", "graticule")
        .attr("clip-path", "url(#maskPath)");

      graticuleGroup
        .append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("stroke-width", isMobile ? "1" : "1.5")
        .attr("stroke-dasharray", "5, 2")
        .attr("stroke", colorGraticule)
        .attr("fill", "transparent");

      updateGlobeData({
        graticuleGroup: graticuleGroup,
      });
    }

    if (!landGroup) {
      let defs = svg.append("defs");
      defs.html(`
        <filter id='inset-shadow'>
          <feOffset dx='0' dy='0'/>
          <feGaussianBlur stdDeviation='15' result='offset-blur'/>
          <feComposite operator='out' in='SourceGraphic' in2='offset-blur' result='inverse'/>
          <feFlood flood-color='#000' flood-opacity='1' result='color'/>
          <feComposite operator='in' in='color' in2='inverse' result='shadow'/>
          <feComposite operator='over' in='shadow' in2='SourceGraphic'/> 
        </filter>
      `);

      landGroup = svg
        .append("g")
        .attr("id", "land")
        .attr("clip-path", "url(#maskPath)");

      updateGlobeData({
        landGroup: landGroup,
      });
    }

    if (!textGroup) {
      let defs = svg.append("defs");
      const value = 0.19;

      defs.html(`
        <filter id="blackOutlineEffect" color-interpolation-filters="sRGB">
          <feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="2.0" />
          <feColorMatrix in="MORPH" result="WHITENED" type="matrix" 
            values="-1 0 0 0 ${value}, 0 -1 0 0 ${value}, 0 0 -1 0 0 ${value}, 0 0 0 1 0" />
          <feMerge>
            <feMergeNode in="WHITENED" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      `);

      textGroup = svgMarker
        .append("g")
        .attr("id", "text")
        .attr("clip-path", "url(#maskPath)");

      textGroup
        .selectAll("text")
        .data(countries?.features)
        .enter()
        .append("text")
        .attr("id", function (d) {
          return `id${parseInt(d?.id)}`;
        })
        .attr("fill", "#fff")
        .attr("x", (d) => {
          return path.centroid(d)[0];
        })
        .attr("y", (d) => {
          return path.centroid(d)[1];
        })
        .attr("filter", "url(#blackOutlineEffect)")
        .attr("text-anchor", "middle")
        .attr("font-size", isMobile ? "11px" : "13.6px")
        .attr("font-family", "Verdana")
        .attr("opacity", isMobile ? 0 : 1) // Hide on mobile, show on desktop
        .text(function (d) {
          return names[`${d.id}`];
        });
    }

    updateGlobeData({
      textGroup: textGroup,
    });

    if (!markerGroup) {
      markerGroup = svgMarker.append("g").attr("id", "marker");
      updateGlobeData({
        markerGroup: markerGroup,
      });
      reloadMarker();
    }

    const { sunOpacity } = suncalcOptionObj.current;

    svgMarker
      .append("defs")
      .append("radialGradient")
      .attr("id", "radialGradient");

    svgMarker
      .select("#radialGradient")
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-opacity", sunOpacity)
      .attr("stop-color", "rgb(255, 255, 255)");

    svgMarker
      .select("#radialGradient")
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-opacity", 0)
      .attr("stop-color", "rgb(255, 255, 255)");

    svgMarker.append("path").attr("id", "sun");

    if (!dayNightGroup) {
      dayNightGroup = svgMarker.append("g").attr("id", "dayNightG");
      updateGlobeData({
        dayNightGroup: dayNightGroup,
      });
    }

    if (!cityGroup) {
      cityGroup = svgMarker.append("g").attr("id", "cityG");
      updateGlobeData({
        cityGroup: cityGroup,
      });
    }

    updateElementRef({
      projection: projection,
    });

    updateGlobeData({
      svg: svg,
      svgMarker: svgMarker,
    });

    updateState({
      isGlobeLoaded: true,
    });
  };

  const colorLuminance = (hex, lum = 0) => {
    let c = null;
    let i = 0;
    let rgb = "#";
    hex = String(hex).replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6)
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

    while (i < 3) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
      rgb += ("00" + c).substr(c.length);
      i++;
    }
    return rgb;
  };

  const getAllSunPositionsAtLng = (lng) => {
    const { precisionLng } = suncalcOptionObj.current;

    let alt, lat, peak, result;
    lat = -90;
    peak = 0;
    result = [];
    while (lat < 90) {
      alt = SunCalc.getPosition(new Date(), lat, lng).altitude;
      if (alt > peak) {
        peak = alt;
        result = [peak, lat];
      }
      lat += precisionLng;
    }
    return result;
  };

  const getSunPosition = () => {
    const { precisionLat } = suncalcOptionObj.current;

    let alt, coords, lng, peak, result;
    lng = -180;
    coords = [];
    peak = 0;
    while (lng < 180) {
      alt = getAllSunPositionsAtLng(lng);
      if (alt[0] > peak) {
        peak = alt[0];
        result = [lng, alt[1]];
      }
      lng += precisionLat;
    }

    return result;
  };

  const getCityOpacity = (coord) => {
    if (SunCalc.getPosition(new Date(), coord[0], coord[1]).altitude > 0) {
      return 0;
    }
    return 1;
  };

  const getCityRadius = (p) => {
    if (p < 200000) return 0.3;
    if (p < 500000) return 0.4;
    if (p < 100000) return 0.5;
    if (p < 2000000) return 0.6;
    if (p < 4000000) return 0.8;
    return 1;
  };

  const scale = () => {
    let { width, height, scaleFactor, minZoom, maxZoom, isMobile } =
      globeDataObj.current;
    let { projection } = elementRefObj.current;

    scaleFactor = Math.min(Math.max(scaleFactor, minZoom), maxZoom);
    updateState({ zoomLevel: scaleFactor });

    // Enhanced zoom level thresholds for mobile
    const boundaryThreshold = isMobile ? 1.5 : 2;
    const labelThreshold = isMobile ? 2.5 : 3;

    const showBoundaries = scaleFactor > boundaryThreshold;
    const showLabels = scaleFactor > labelThreshold;

    if (
      state.showBoundaries !== showBoundaries ||
      state.showLabels !== showLabels
    ) {
      updateState({
        showBoundaries,
        showLabels,
      });
    }

    projection.scale((scaleFactor * Math.min(width, height)) / 2);

    updateElementRef({
      projection: projection,
    });

    window.requestAnimationFrame(render);
  };

  const reloadMarker = () => {
    let { markerGroup, markerArray, markerSize } = globeDataObj.current;

    let { tempPath } = pathRefObj.current;

    markerGroup.selectAll("image").remove();

    markerGroup
      .selectAll("image")
      .data(markerArray)
      .enter()
      .append("image")
      .attr("width", markerSize)
      .attr("height", markerSize)
      .attr("id", (d) => {
        return d.id;
      })
      .attr("visibility", (d) => {
        return getVisibility(tempPath, d);
      })
      .attr("pointer-events", "visiblePainted")
      .attr("xlink:href", (d) => {
        let { selectedMarkerID } = globeDataObj.current;

        return selectedMarkerID
          ? selectedMarkerID === d.id
            ? "assets/map-pin_selected-v2.svg"
            : "assets/map-pin-v2.svg"
          : "assets/map-pin-v2.svg";
      })
      .attr("transform", (d) => {
        let { projection } = elementRefObj.current;

        let p = projection([d.long, d.lat]);
        return `translate(${p[0] - markerSize / 2}, ${p[1] - markerSize}) `;
      })
      .call(
        d3
          .drag()
          .on("start", (event) => {
            markerDragEvent(event);
          })
          .on("drag", (event) => {
            markerDragEvent(event);
          })
          .on("end", (event) => {
            markerDragEvent(event);
            updateGlobeData({
              selectedMarkerID: null,
            });
            reloadMarker();
            reloadMarkerLineArray();
            renderMarker();
            addClickedMarkerToFindCountry(event);
          })
      );

    updateGlobeData({
      markerGroup: markerGroup,
    });
  };

  const markerDragEvent = (event) => {
    let { markerGroup, markerArray, svgMarker, selectedMarkerID } =
      globeDataObj.current;

    let { projection } = elementRefObj.current;

    markerGroup.selectAll("image").remove();
    updateGlobeData({
      markerGroup: markerGroup,
    });

    let pos = projection.invert(getPointerPosition(event, svgMarker.node()));

    let markerID = event.subject.id;
    let markerIndex = markerArray.findIndex((item) => {
      return item.id === markerID;
    });

    selectedMarkerID = markerID;

    markerArray[markerIndex] = {
      id: markerID,
      long: pos[0],
      lat: pos[1],
    };

    markerArray = markerArray.slice();
    updateGlobeData({
      markerArray: markerArray,
      selectedMarkerID: selectedMarkerID,
    });

    reloadMarker();
    reloadMarkerLineArray();
    renderMarker();
    mousemove(event);
  };

  const render = () => {
    let {
      width,
      height,
      colorWater,
      colorGraticule,
      colorLand,
      water,
      land,
      countries,
      scaleFactor,

      textGroup,
      landGroup,
      cityGroup,
      dayNightGroup,
      markerGroup,
      enableDayNightMode,
    } = globeDataObj.current;

    let { graticule, context, contextOp } = elementRefObj.current;

    let { path } = pathRefObj.current;

    context.clearRect(0, 0, width, height);
    contextOp.clearRect(0, 0, width, height);

    if (enableDayNightMode) {
      fill(
        {
          context,
          path,
        },
        water,
        colorWater
      );

      fill(
        {
          context,
          path,
        },
        water,
        "#00000066"
      );

      renderDayNightPath();
    } else {
      cityGroup.selectAll("circle").remove();
      fill(
        {
          context,
          path,
        },
        water,
        colorWater
      );
    }

    stroke(
      {
        context,
        path,
      },
      graticule,
      colorGraticule
    );

    fill(
      {
        context,
        path,
      },
      land,
      colorLand
    );

    stroke(
      {
        context,
        path,
      },
      countries,
      "#00000088"
    );

    if (enableDayNightMode) {
      renderCities();
    } else {
      cityGroup.selectAll("circle").remove();
    }

    textGroup.selectAll("text").attr("opacity", `${scaleFactor > 2 ? 1 : 0}`);
    landGroup.selectAll("path").remove();

    renderMarker();
    renderSelectedCountry();

    updateGlobeData({
      textGroup: textGroup,
      landGroup: landGroup,
      markerGroup: markerGroup,
      isLoadedMap: true,
    });

    if (scaleFactor >= 2) {
      renderText();
    }

    if (!enableDayNightMode) {
      dayNightGroup.selectAll("path").remove();
    }
  };

  const renderCities = () => {
    let { cityGroup, cities, scaleFactor } = globeDataObj.current;

    const { lightsColor } = suncalcOptionObj.current;

    let { context, projection } = elementRefObj.current;

    let { path, tempPath } = pathRefObj.current;

    cityGroup.selectAll("circle").remove();

    cities?.forEach((cityObj, index) => {
      let coords = [parseFloat(cityObj[2]), parseFloat(cityObj[3])];

      let geoPath = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(cityObj[3]), parseFloat(cityObj[2])],
        },
      };

      const opacity = getCityOpacity(coords);

      if (opacity > 0) {
        let isVisible =
          getVisibility(tempPath, {
            long: cityObj[3],
            lat: cityObj[2],
          }) === "visible";

        if (isVisible) {
          let placePoint = projection([
            parseFloat(cityObj[3]),
            parseFloat(cityObj[2]),
          ]);
          let cityRadius = getCityRadius(cityObj[0]);

          fillCity(
            {
              context,
              path,
            },
            placePoint,
            scaleFactor,
            cityRadius,
            lightsColor,
            opacity
          );
        }
      }
    });
  };

  const renderDayNightPath = () => {
    let { colorGraticule } = globeDataObj.current;

    let { context } = elementRefObj.current;

    let { path } = pathRefObj.current;

    const geoPath = getPathString(isNorthSun());

    fill(
      {
        context,
        path,
      },
      geoPath,
      "#74ccf466"
    );

    stroke(
      {
        context,
        path,
      },
      geoPath,
      colorGraticule
    );
  };

  const renderSunObj = () => {
    let { svgMarker, width, height } = globeDataObj.current;

    let { projection, context } = elementRefObj.current;

    let {
      tempPath,
      path,
      // geoCircle
    } = pathRefObj.current;

    const sunPos = getSunPosition();
    let sunXYPos = projection(sunPos);

    const sunRadius = width > height ? width / 2 : height / 2;

    let geoCircle = d3.geoCircle().center([0.1278, 51.5074]).radius(5);

    const config = {
      radius: 90,
      center: sunPos,
    };

    var circle = d3.geoCircle().center(sunPos).radius(90);

    var grd = context.createRadialGradient(
      sunXYPos[0],
      sunXYPos[1],
      60,
      sunXYPos[0],
      sunXYPos[1],
      70
    );
    grd.addColorStop(0.2, "#fff2");
    grd.addColorStop(1, "#fff2");

    updateGlobeData({
      svgMarker: svgMarker,
    });
  };

  const renderCanvasText = (obj, color) => {
    let { projection, graticule, context, contextOp } = elementRefObj.current;

    let { path, pathOp, tempPath } = pathRefObj.current;

    context.font = "48px serif";
    context.fillText("Hello world", 10, 50);
  };

  const renderMarker = () => {
    let { markerGroup, markerSize } = globeDataObj.current;

    let { tempPath } = pathRefObj.current;

    markerGroup
      .selectAll("image")
      .attr("visibility", (d) => {
        return getVisibility(tempPath, d);
      })
      .attr("transform", (d) => {
        let { projection } = elementRefObj.current;

        let p = projection([d.long, d.lat]);
        return `translate(${p[0] - markerSize / 2}, ${p[1] - markerSize})`;
      });
  };

  const renderSelectedCountry = () => {
    let { currentCountry, textGroup, selectedCounytryID } =
      globeDataObj.current;

    let { path } = pathRefObj.current;

    if (currentCountry) {
      showCountry();

      selectedCounytryID = `text#id${parseInt(currentCountry.id)}`;
      textGroup
        .selectAll(selectedCounytryID)
        .attr("opacity", 1)
        .attr("x", (d1) => {
          return path.centroid(d1)[0];
        })
        .attr("y", (d1) => {
          return path.centroid(d1)[1];
        });

      // renderSVGCities(currentCountry.id);
    }

    updateGlobeData({
      textGroup: textGroup,
    });
  };

  const showCountry = () => {
    let { landGroup, currentCountry, enableDayNightMode } =
      globeDataObj.current;

    let { projection } = elementRefObj.current;

    landGroup
      .selectAll("path")
      .data([currentCountry])
      .enter()
      .append("path")
      .attr("d", d3.geoPath().projection(projection))
      .attr("opacity", enableDayNightMode ? "0.6" : "1.0")
      .attr("fill", "#555")
      .attr("stroke-width", "1.85")
      .attr("stroke-dasharray", "5,3")
      .attr("stroke", "#ccc")
      .attr("filter", "url(#inset-shadow)");

    updateGlobeData({
      landGroup: landGroup,
    });
  };

  const renderText = () => {
    let { textGroup } = globeDataObj.current;

    let { path, tempPath } = pathRefObj.current;

    textGroup
      .selectAll("text")
      .attr("x", (d) => {
        return path.centroid(d)[0];
      })
      .attr("y", (d) => {
        return path.centroid(d)[1];
      });

    updateGlobeData({
      textGroup: textGroup,
    });
  };

  const mousemove = (event) => {
    let { currentCountry } = globeDataObj.current;

    let c = getCountry(event);

    if (!c) {
      if (currentCountry) {
        currentCountry = null;
        updateGlobeData({
          currentCountry: currentCountry,
        });
        window.requestAnimationFrame(render);
      }
      return;
    }
    if (c === currentCountry) {
      return;
    }
    currentCountry = c;
    updateGlobeData({
      currentCountry: currentCountry,
    });

    window.requestAnimationFrame(render);
  };

  const mouseClicked = (event) => {
    // addClickedMarker(event);
    addClickedMarkerToFindCountry(event);
  };

  const dragstarted = (event) => {
    let { scaleFactor, transform } = globeDataObj.current;

    let { v0, r0, q0, canvas } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    v0 = versor.cartesian(projection.invert(d3.pointer(event, canvas.node())));
    r0 = projection.rotate();
    q0 = versor(r0);
    // stopRotation()

    updateGlobeData({
      v0: v0,
      r0: r0,
      q0: q0,
    });

    updateElementRef({
      projection: projection,
    });
  };

  const dragged = (event) => {
    let { v0, r0, q0, canvas } = globeDataObj.current;

    // return;

    let { projection } = elementRefObj.current;

    let v1 = versor.cartesian(
      projection.rotate(r0).invert(d3.pointer(event, canvas.node()))
    );
    let q1 = versor.multiply(q0, versor.delta(v0, v1));
    let r1 = versor.rotation(q1);
    // r1[1] = 0
    r1[2] = 0;
    projection.rotate(r1);

    updateElementRef({
      projection: projection,
    });

    // render()
    window.requestAnimationFrame(render);
  };

  const dragended = () => {
    // startRotation(rotationDelay)
  };

  const addClickedMarker = (event) => {
    let { width, height, canvas, markerArray } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    let pos = projection.invert(d3.pointer(event, canvas.node()));
    let center = projection.invert([width / 2, height / 2]);

    updateElementRef({
      projection: projection,
    });

    // console.log(center)

    d3.transition()
      .duration(1000)
      .tween("rotate", () => {
        const r = d3.interpolate([-center[0], -center[1]], [-pos[0], -pos[1]]);
        return (t) => {
          let { projection } = elementRefObj.current;

          projection.rotate(r(t));
          updateElementRef({
            projection: projection,
          });
          // render();
          window.requestAnimationFrame(render);
        };
      })
      .on("end", () => {
        let { markerArray } = globeDataObj.current;

        let placeObj = {
          id: `mark${markerArray.length + 1}`,
          long: pos[0],
          lat: pos[1],
        };

        markerArray.push(placeObj);
        updateGlobeData({
          markerArray: markerArray,
        });

        reloadMarkerLineArray();
        reloadMarker();
        // render();
        window.requestAnimationFrame(render);
      });
  };

  const moveMarkerToFindCountryByLatLong = (coordinates) => {
    let { width, height, canvas, markerArray, markerGroup, svgMarker } =
      globeDataObj.current;

    let { projection } = elementRefObj.current;

    let country = getCountryFromCoordinates(coordinates);
    let selectedCountryCode = null;
    let selectedPlaceCoordinate = null;
    let isPlaceVisible = false;
    selectedPlaceCoordinate = coordinates;

    if (!lodash.isNil(country)) {
      selectedCountryCode = country?.id;
      isPlaceVisible = true;
    }

    props.setUserConfig({
      ...userConfig,
      selectedInputCoordinate: null,
      isPlaceVisible: isPlaceVisible,
      selectedCountryCode: selectedCountryCode,
      selectedPlaceCoordinate: selectedPlaceCoordinate,
    });

    let pos = [
      parseFloat(coordinates?.longitude),
      parseFloat(coordinates?.latitude),
    ];
    let center = projection.invert([width / 2, height / 2]);

    updateElementRef({
      projection: projection,
    });

    // console.log(center)
    markerArray = [];

    let placeObj = {
      id: `mark${markerArray.length + 1}`,
      long: pos[0],
      lat: pos[1],
    };

    markerArray.push(placeObj);

    updateGlobeData({
      markerArray: markerArray,
    });

    reloadMarkerLineArray();
    reloadMarker();
    renderMarker();

    d3.transition()
      .duration(1000)
      .tween("rotate", () => {
        const r = d3.interpolate([-center[0], -center[1]], [-pos[0], -pos[1]]);
        return (t) => {
          let { projection } = elementRefObj.current;

          projection.rotate(r(t));
          updateElementRef({
            projection: projection,
          });

          // render();
          window.requestAnimationFrame(render);
        };
      })
      .on("end", () => {});
  };

  const addClickedMarkerToFindCountry = async (event) => {
    let { width, height, canvas, markerArray } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    let country = getCountry(event);
    let selectedCountryCode = null;
    let selectedPlaceCoordinate = null;
    let isPlaceVisible = false;
    let pointerPos = getPointerPosition(event, canvas.node());
    let pos = projection.invert(pointerPos);

    // Ensure consistent coordinate precision
    const latitude = parseFloat(pos[1].toFixed(8));
    const longitude = parseFloat(pos[0].toFixed(8));

    if (!lodash.isNil(country)) {
      selectedCountryCode = country?.id;
      isPlaceVisible = true;
    }

    selectedPlaceCoordinate = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    };

    // Add this navigation
    navigate(
      `/location/${selectedPlaceCoordinate.latitude}/${selectedPlaceCoordinate.longitude}`
    );

    await props.setUserConfig({
      ...userConfig,
      selectedInputCoordinate: null,
      isPlaceVisible: isPlaceVisible,
      selectedCountryCode: selectedCountryCode,
      selectedPlaceCoordinate: selectedPlaceCoordinate,
    });

    let center = projection.invert([width / 2, height / 2]);

    updateElementRef({
      projection: projection,
    });

    // console.log(center)
    markerArray = [];

    let placeObj = {
      id: `mark${markerArray.length + 1}`,
      long: pos[0],
      lat: pos[1],
    };

    markerArray.push(placeObj);
    updateGlobeData({
      markerArray: markerArray,
    });

    reloadMarkerLineArray();
    reloadMarker();
    renderMarker();

    d3.transition()
      .duration(1000)
      .tween("rotate", () => {
        const r = d3.interpolate([-center[0], -center[1]], [-pos[0], -pos[1]]);
        return (t) => {
          let { projection } = elementRefObj.current;

          projection.rotate(r(t));
          updateElementRef({
            projection: projection,
          });
          window.requestAnimationFrame(render);
        };
      })
      .on("end", () => {});
  };

  const showPlaceItem = (placeItem) => {
    let { width, height, canvas, markerArray } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    let center = projection.invert([width / 2, height / 2]);

    updateElementRef({
      projection: projection,
    });

    // console.log(center)

    markerArray = [];

    let placeObj = {
      id: `mark${markerArray.length + 1}`,
      long: placeItem.longitude,
      lat: placeItem.latitude,
    };

    markerArray.push(placeObj);
    updateGlobeData({
      markerArray: markerArray,
    });

    reloadMarkerLineArray();
    reloadMarker();
    renderMarker();

    d3.transition()
      .duration(1000)
      .tween("rotate", () => {
        const r = d3.interpolate(
          [-center[0], -center[1]],
          [-placeItem.longitude, -placeItem.latitude]
        );
        return (t) => {
          let { projection } = elementRefObj.current;

          projection.rotate(r(t));
          updateElementRef({
            projection: projection,
          });

          // render();
          window.requestAnimationFrame(render);
        };
      })
      .on("end", () => {});
  };

  const reloadMarkerLineArray = () => {
    let { markerLineArray, markerArray, markerPolygonArray } =
      globeDataObj.current;

    markerLineArray = [];
    markerPolygonArray = [];

    if (markerArray.length > 1) {
      let coordinateArray = [];
      markerArray.forEach((item, index) => {
        let lineObj;
        if (index === markerArray.length - 1) {
          lineObj = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [item.long, item.lat],
                [markerArray[0].long, markerArray[0].lat],
              ],
            },
          };
        } else if (markerArray.length > 2) {
          lineObj = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [item.long, item.lat],
                [markerArray[index + 1].long, markerArray[index + 1].lat],
              ],
            },
          };
        }

        markerLineArray.push(lineObj);
        coordinateArray.push([item.long, item.lat]);
      });

      if (coordinateArray.length > 2) {
        coordinateArray.push([markerArray[0].long, markerArray[0].lat]);
        let polygonObj = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "MultiPolygon",
                coordinates: [[coordinateArray]],
              },
            },
          ],
        };

        markerPolygonArray.push(polygonObj);
      }
    }

    updateGlobeData({
      markerLineArray: markerLineArray,
      markerPolygonArray: markerPolygonArray,
    });
  };

  const getCountry = (event) => {
    let { countries, canvas } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    let pos = projection.invert(getPointerPosition(event, canvas.node()));
    // console.log("pos: ", pos)

    return countries?.features.find((f) => {
      return f.geometry.coordinates.find((c1) => {
        return (
          polygonContains(c1, pos) ||
          c1.find((c2) => {
            return polygonContains(c2, pos);
          })
        );
      });
    });
  };

  const getCountryFromCoordinates = (coordinates) => {
    let { countries, canvas } = globeDataObj.current;

    let { projection } = elementRefObj.current;

    let pos = [coordinates?.longitude, coordinates?.latitude];
    // console.log("pos: ", pos)

    return countries?.features.find((f) => {
      return f.geometry.coordinates.find((c1) => {
        return (
          polygonContains(c1, pos) ||
          c1.find((c2) => {
            return polygonContains(c2, pos);
          })
        );
      });
    });
  };

  /*  Server Request Methods  */

  const loadData = (callback) => {
    //https://unpkg.com/world-atlas@1/world/110m.json

    d3.json("data/world.geojson").then((world) => {
      d3.json("data/cities-200000.json").then((cities) => {
        d3.tsv("data/countries.tsv").then((countries) => {
          callback(world, countries, cities);
        });
      });
    });
  };

  /*  Server Response Methods  */

  /*  Server Response Handler Methods  */

  /*  Custom-Component sub-render Methods */

  const renderMasterContainer = () => {
    return (
      <>
        <Flex
          ref={containerRef}
          flex={1}
          bg={"#000"}
          // zIndex={10}
          className="globeContainer"
        >
          <canvas ref={canvasRef} className="globe"></canvas>
          <svg ref={svgRef} className="globesvg"></svg>
          <canvas ref={canvasOpRef} className="operation"></canvas>
          <svg ref={svgMarkerRef} className="globesvg"></svg>
        </Flex>
      </>
    );
  };

  return renderMasterContainer();
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

export default connect(mapStateToProps, mapDispatchToProps)(MasterGlobeView);
