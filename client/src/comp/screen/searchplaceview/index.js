import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Text,
  Flex,
  IconButton,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  Spacer,
  useMediaQuery,
  Stack,
} from "@chakra-ui/react";

import { CloseIcon, Search2Icon } from "@chakra-ui/icons";

import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
} from "@choc-ui/chakra-autocomplete";

import { BsFillStarFill, BsStar } from "react-icons/bs";

import { MdLocationPin } from "react-icons/md";

import { connect } from "react-redux";

import lodash from "lodash";
import * as geolib from "geolib";

import PlaceInfoView from "./placeInfo";
import MasterGlobeView from "../globeview";
import MapView from "../mapview";
import NavBarView from "../navbar";

import Actions from "../../redux/action";
import Constants from "../../utils/Constants";
import AppManager from "../../utils/AppManager";

import MasterWorldArray from "../../data/info/countries+states+cities.json";

const { MasterDrawerMenuType, PlaceType, AppNotifKey } = Constants;

const SearchPlaceView = (props) => {
  const {
    userConfig,
    userPref,
    menuType = MasterDrawerMenuType.Search,
  } = props;

  const navigate = useNavigate();

  const [state, setState] = useState({
    placeName: "",
    searchResultArray: [],
    placeItem: null,
    placeholder: "Searching...",
    isSearching: false,
    favPlaceArray: userPref?.favPlaceArray ?? [],
    isAppLoaded: false,
  });

  const [searchKeyword, setSearchKeyword] = useState("");

  // Check if the screen is mobile size
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  const updateState = (data) =>
    setState((preState) => ({ ...preState, ...data }));

  let searchTimer = useRef();

  /*  Life-cycles Methods */

  useEffect(() => {
    props.setUserConfig({
      ...userConfig,
      selectedInputCoordinate: null,
      isPlaceVisible: null,
      selectedCountryCode: null,
      selectedPlaceCoordinate: null,
      selectedPlaceItem: null,
    });
    addEventListener();
    setTimeout(async () => {
      await updateState({
        isAppLoaded: true,
      });
      await props.setUserConfig({
        ...userConfig,
        selectedMenuType: menuType,
      });

      await props.setIsMasterAppLoading(false);
    }, 800);
    return () => {
      removeEventListener();
    };
  }, []);

  useEffect(() => {
    let selectedCountryCode = userConfig?.selectedCountryCode;

    if (!lodash.isNil(selectedCountryCode)) {
      setCountryFromCountryCode(selectedCountryCode);
    }
  }, [userConfig]);

  useEffect(() => {
    props.setUserConfig({
      ...userConfig,
      selectedMenuType: menuType,
    });
  }, [menuType]);

  useEffect(() => {
    clearSearchTimer();
    updateState({
      placeholder: "Searching...",
      isSearching: true,
    });
    searchTimer.current = setTimeout(() => {
      searchPlaceFromKeyword(searchKeyword);
    }, 500);
  }, [searchKeyword]);

  /*  Public Interface Methods */

  const addEventListener = () => {
    AppManager.getInstance().addEventListener(
      AppNotifKey.SHOW_FAV_PLACE,
      emitOnPressPlaceItem,
    );
  };

  const removeEventListener = () => {
    AppManager.getInstance().removeEventListener(
      AppNotifKey.SHOW_FAV_PLACE,
      emitOnPressPlaceItem,
    );
  };

  const emitOnPressPlaceItem = (favPlaceItem) => {
    onPressPlaceItem(favPlaceItem);
  };

  const closetSort = (array, keyword) => {
    return array.sort((a, b) => {
      if (
        a.name.toLowerCase().indexOf(keyword.toLowerCase()) >
        b.name.toLowerCase().indexOf(keyword.toLowerCase())
      ) {
        return 1;
      } else if (
        a.name.toLowerCase().indexOf(keyword.toLowerCase()) <
        b.name.toLowerCase().indexOf(keyword.toLowerCase())
      ) {
        return -1;
      } else {
        if (a.name > b.name) return 1;
        else return -1;
      }
    });
  };

  const setCountryFromCountryCode = async (countryCode) => {
    let filterCountryArray = MasterWorldArray.filter((item) => {
      return item.numeric_code
        .toLowerCase()
        .includes(countryCode.toLowerCase());
    }).slice(0, 1);

    let nearByCityDistance = 2000;
    let nearByStateDistance = 80000;
    let nearByPlaceItem = null;
    let finalNearByPlaceItem = null;

    if (filterCountryArray.length > 0) {
      let selectedPlaceCoordinate = userConfig?.selectedPlaceCoordinate;

      let countryItem = filterCountryArray[0];
      let nearByPlaceArray = countryItem.states.filter((stateObj) => {
        return (
          stateObj.cities.filter((city) => {
            return (
              geolib.getDistance(selectedPlaceCoordinate, {
                latitude: city?.latitude ?? 0,
                longitude: city?.longitude ?? 0,
              }) <= nearByCityDistance
            );
          }).length > 0
        );
      });

      if (nearByPlaceArray.length > 0) {
        let nearByStateItem = nearByPlaceArray[0];
        finalNearByPlaceItem = {
          ...nearByStateItem,
          ...selectedPlaceCoordinate,
          type: PlaceType.State,
          countryItem: lodash.omit(countryItem, ["states"]),
          countryName: countryItem.name,
          address: `${nearByStateItem.name}, ${countryItem.name}`,
        };

        nearByPlaceItem = nearByStateItem.cities.filter((city) => {
          return (
            geolib.getDistance(selectedPlaceCoordinate, {
              latitude: city?.latitude ?? 0,
              longitude: city?.longitude ?? 0,
            }) <= nearByCityDistance
          );
        });

        if (nearByPlaceItem.length > 0) {
          nearByPlaceItem = nearByPlaceItem[0];

          finalNearByPlaceItem = {
            ...nearByPlaceItem,
            ...selectedPlaceCoordinate,
            type: PlaceType.City,
            countryItem: lodash.omit(countryItem, ["states"]),
            stateItem: lodash.omit(nearByStateItem, ["cities"]),
            stateName: nearByStateItem?.name,
            countryName: countryItem.name,
            address: `${nearByPlaceItem.name}, ${nearByStateItem.name}, ${countryItem.name}`,
          };
        }

        updateState({
          placeItem: finalNearByPlaceItem,
        });

        return;
      } else {
        nearByPlaceArray = countryItem.states.filter((stateObj) => {
          return (
            geolib.getDistance(selectedPlaceCoordinate, {
              latitude: stateObj?.latitude ?? 0,
              longitude: stateObj?.longitude ?? 0,
            }) <= nearByStateDistance
          );
        });

        if (nearByPlaceArray.length > 0) {
          let nearByStateItem = nearByPlaceArray[0];

          finalNearByPlaceItem = {
            ...nearByStateItem,
            ...selectedPlaceCoordinate,
            type: PlaceType.State,
            countryItem: lodash.omit(countryItem, ["states"]),
            countryName: countryItem.name,
            address: `${nearByStateItem.name}, ${countryItem.name}`,
          };

          updateState({
            placeItem: finalNearByPlaceItem,
          });

          return;
        }
      }

      countryItem = lodash.omit(countryItem, ["states"]);

      countryItem = {
        ...countryItem,
        ...selectedPlaceCoordinate,
        type: PlaceType.Country,
        address: `${countryItem.name}`,
      };

      updateState({
        placeItem: countryItem,
      });
    }

    await props.setUserConfig({
      ...userConfig,
      selectedCountryCode: null,
      selectedPlaceCoordinate: null,
    });
  };

  const isSearchPlaceFromWithinSettings = (type) => {
    let appSettingObj = userPref?.appSettings ?? {};
    let searchPlaceFromArray = appSettingObj?.searchPlaceFrom ?? [
      PlaceType.Country,
      PlaceType.State,
      PlaceType.City,
    ];

    return searchPlaceFromArray.includes(type);
  };

  const searchPlaceFromKeyword = (placeName) => {
    let isCountrySearchEnabled = isSearchPlaceFromWithinSettings(
      PlaceType.Country,
    );
    let isStateSearchEnabled = isSearchPlaceFromWithinSettings(PlaceType.State);
    let isCitySearchEnabled = isSearchPlaceFromWithinSettings(PlaceType.City);

    let filterCountryArray = [],
      filterStateArray = [],
      filterCityArray = [];

    if (lodash.isString(placeName)) {
      placeName = placeName.trim();
    }

    if (
      !lodash.isString(placeName) ||
      (lodash.isString(placeName) && placeName.length === 0)
    ) {
      updateState({
        searchResultArray: [],
      });

      return;
    }

    const maxResultCount = 50; // Increased from 15 to show more results

    if (isCountrySearchEnabled) {
      filterCountryArray = MasterWorldArray.map((item) => {
        return lodash.omit(item, ["states"]);
      });

      filterCountryArray = filterCountryArray.filter((item) => {
        // Enhanced search to include partial matches and ISO codes
        return (
          item.name.toLowerCase().includes(placeName.toLowerCase()) ||
          (item.iso &&
            item.iso.toLowerCase().includes(placeName.toLowerCase())) ||
          (item.iso3 &&
            item.iso3.toLowerCase().includes(placeName.toLowerCase())) ||
          (item.numeric_code &&
            item.numeric_code.toLowerCase().includes(placeName.toLowerCase()))
        );
      });

      filterCountryArray = closetSort(filterCountryArray, placeName);

      filterCountryArray = filterCountryArray.map((item) => {
        return {
          ...item,
          type: PlaceType.Country,
          address: `${item.name}`,
        };
      });
    }

    if (isStateSearchEnabled) {
      filterStateArray = MasterWorldArray.filter((item) => {
        return (
          (item?.states ?? []).filter((stateItem) => {
            return stateItem.name
              .toLowerCase()
              .includes(placeName.toLowerCase());
          }).length > 0
        );
      }).slice(0, maxResultCount);

      filterStateArray = filterStateArray
        .map((item) => {
          return item.states.map((stateItem) => {
            return {
              ...stateItem,
              type: PlaceType.State,
              countryItem: lodash.omit(item, ["states"]),
              countryName: item.name,
            };
          });
        })
        .flat();

      filterStateArray = filterStateArray
        .filter((item) => {
          // Enhanced search to include partial word matches for states
          const stateName = item.name.toLowerCase();
          const searchTerm = placeName.toLowerCase();

          // Check for exact inclusion
          if (stateName.includes(searchTerm)) return true;

          // Check for partial word matches
          const stateWords = stateName.split(" ");
          return stateWords.some((word) => word.startsWith(searchTerm));
        })
        .slice(0, maxResultCount);

      filterStateArray = filterStateArray.map((item) => {
        return lodash.omit(item, ["cities"]);
      });

      filterStateArray = closetSort(filterStateArray, placeName);

      filterStateArray = filterStateArray.map((item) => {
        return {
          ...item,
          address: `${item.name}, ${item.countryName}`,
        };
      });
    }

    if (isCitySearchEnabled) {
      filterCityArray = MasterWorldArray.filter((item) => {
        return (
          (item?.states ?? []).filter((stateItem) => {
            return (
              (stateItem?.cities ?? []).filter((cityItem) => {
                return cityItem.name
                  .toLowerCase()
                  .includes(placeName.toLowerCase());
              }).length > 0
            );
          }).length > 0
        );
      }).slice(0, maxResultCount);

      filterCityArray = filterCityArray
        .map((item) => {
          return (item?.states ?? []).map((stateItem) => {
            return (stateItem?.cities ?? []).map((cityItem) => {
              return {
                ...cityItem,
                type: PlaceType.City,
                countryItem: lodash.omit(item, ["states"]),
                stateItem: lodash.omit(stateItem, ["cities"]),
                stateName: stateItem?.name,
                countryName: item.name,
              };
            });
          });
        })
        .flat(3);

      filterCityArray = filterCityArray
        .filter((item) => {
          // Enhanced search to include partial word matches for cities
          if (!item?.name) return false;

          const cityName = item.name.toLowerCase();
          const searchTerm = placeName.toLowerCase();

          // Check for exact inclusion
          if (cityName.includes(searchTerm)) return true;

          // Check for partial word matches
          const cityWords = cityName.split(" ");
          return cityWords.some((word) => word.startsWith(searchTerm));
        })
        .slice(0, maxResultCount);

      filterCityArray = closetSort(filterCityArray, placeName);

      filterCityArray = filterCityArray.map((item) => {
        return {
          ...item,
          address: `${item.name}, ${item.stateName}, ${item.countryName}`,
        };
      });
    }

    // Combine all results without additional slicing to show more results
    let searchResultArray = [
      ...filterCityArray,
      ...filterStateArray,
      ...filterCountryArray,
    ];

    // Sort results by relevance but don't limit the total number
    searchResultArray = closetSort(searchResultArray, placeName);

    updateState({
      isSearching: false,
      placeholder: searchResultArray.length > 0 ? "" : "No result found",
      searchResultArray: searchResultArray,
    });
  };

  const clearSearchTimer = () => {
    searchTimer.current && clearTimeout(searchTimer.current);

    searchTimer.current = null;
  };

  /*  UI Events Methods   */

  const handleChange = (event) => {
    let placeName = event?.target?.value;
    setSearchKeyword(placeName);
  };

  const onPressPlaceItem = async (placeItem) => {
    await props.setUserConfig({
      ...userConfig,
      selectedPlaceItem: placeItem,
      isPlaceVisible: true,
    });

    setSearchKeyword("");

    updateState({
      placeItem: placeItem,
      searchResultArray: [],
    });

    // Navigate to location details page
    if (placeItem?.latitude && placeItem?.longitude) {
      navigate(`/location/${placeItem.latitude}/${placeItem.longitude}`);
    }
  };

  const onPressMakeFavItem = async (isFavPlace, favPlaceIndex, placeItem) => {
    let favPlaceArray = userPref?.favPlaceArray ?? [];

    if (isFavPlace) {
      if (favPlaceIndex >= 0) {
        favPlaceArray.splice(favPlaceIndex, 1);

        await props.setUserPref({
          ...userPref,
          favPlaceArray: favPlaceArray.slice(),
        });
      }
    } else {
      favPlaceArray.push(placeItem);

      await props.setUserPref({
        ...userPref,
        favPlaceArray: favPlaceArray.slice(),
      });
    }
  };

  const onClickClearButton = () => {
    setSearchKeyword("");
    updateState({
      searchResultArray: [],
    });
  };

  /*  Server Request Methods  */

  /*  Server Response Methods  */

  /*  Server Response Handler Methods  */

  /*  Custom-Component sub-render Methods */

  const renderSearchResultList = () => {
    return (
      <Flex flex={1} bg={"chakra-body-bg"}>
        <AutoComplete
          onSelectOption={(params) => {
            onPressPlaceItem(params?.item?.originalValue);
          }}
          suggestWhenEmpty={false}
          emptyState={
            <Flex
              flexDirection={"row"}
              alignItems={"center"}
              justifyContent={"center"}
            >
              {state?.isSearching && (
                <Icon as={Search2Icon} boxSize={"15px"} me={2} />
              )}
              <Text fontSize="md" align={"center"}>
                {`${state?.placeholder}`}
              </Text>
            </Flex>
          }
        >
          <InputGroup bg={"chakra-body-bg"} size="md">
            <InputLeftElement
              pointerEvents="none"
              color="gray.300"
              fontSize="1.2em"
              children={<Icon as={MdLocationPin} boxSize={"20px"} />}
            />
            <AutoCompleteInput
              variant="filled"
              placeholder="Enter place name to search"
              value={searchKeyword}
              onChange={handleChange}
            />
            <InputRightElement
              children={
                <IconButton
                  onClick={onClickClearButton}
                  alignSelf={"center"}
                  variant="solid"
                  borderStartRadius={0}
                  icon={
                    <Icon
                      alignSelf={"center"}
                      as={CloseIcon}
                      boxSize={"15px"}
                    />
                  }
                />
              }
            />
          </InputGroup>
          <AutoCompleteList paddingY={3} marginTop={"2px"}>
            {(state?.searchResultArray ?? []).map((item, index) => {
              let favPlaceArray = userPref?.favPlaceArray ?? [];
              favPlaceArray = favPlaceArray.map(
                (favPlaceItem) => favPlaceItem?.address,
              );
              let isFavPlace = favPlaceArray.includes(item?.address);
              let favPlaceIndex = -1;
              if (isFavPlace) {
                favPlaceIndex = favPlaceArray.findIndex(
                  (favPlaceAddress) => favPlaceAddress === item?.address,
                );
              }

              return (
                <AutoCompleteItem
                  onClick={() => {
                    onPressPlaceItem(item);
                  }}
                  key={`option-${index}`}
                  getValue={(item) => item?.address}
                  value={item}
                >
                  <Flex flexDirection={"column"} flex={1}>
                    <Flex
                      flexDirection={"row"}
                      justifyContent={"center"}
                      alignItems={"center"}
                    >
                      <Icon
                        justifySelf={"center"}
                        alignSelf={"center"}
                        as={MdLocationPin}
                        boxSize={"15px"}
                        me={3}
                      />
                      <Text fontSize="md">{`${item.address}`}</Text>
                      <Spacer />
                      <IconButton
                        variant={"solid"}
                        onClick={() => {
                          onPressMakeFavItem(isFavPlace, favPlaceIndex, item);
                        }}
                        icon={
                          <Icon
                            alignSelf={"center"}
                            as={isFavPlace ? BsFillStarFill : BsStar}
                            boxSize={"15px"}
                          />
                        }
                      />
                    </Flex>
                  </Flex>
                </AutoCompleteItem>
              );
            })}
          </AutoCompleteList>
        </AutoComplete>
      </Flex>
    );
  };

  const renderMasterContainer = () => {
    return (
      <Flex
        flex={1}
        direction={"column"}
        height="100vh"
        visibility={state?.isAppLoaded ? "visible" : "hidden"}
      >
        <NavBarView />
        {isMobile ? (
          // Mobile layout - only show search bar and globe view
          <Flex flex={1} flexDirection="column" overflow="hidden">
            <Box pointerEvents={"auto"} px={3} pt={3} bg={"#000"} zIndex={10}>
              <Box
                borderRadius={"5px"}
                overflow={"hidden"}
                bg={"chakra-body-bg"}
                mb={3}
              >
                {renderSearchResultList()}
              </Box>
            </Box>
            <Box
              flex={1}
              width="100%"
              height="calc(100vh - 120px)"
              overflow={"visible"}
            >
              {state?.isAppLoaded &&
                (userConfig.viewMode === "globe" ? (
                  <MasterGlobeView />
                ) : (
                  <MapView />
                ))}
            </Box>
          </Flex>
        ) : (
          // Desktop layout - side by side
          <Flex flex={1} flexDirection={"row"} overflow="hidden">
            <Flex
              flex={1}
              pointerEvents={"auto"}
              pt={3}
              ps={3}
              pe={3}
              flexDirection={"column"}
              bg={"#000"}
            >
              <Box
                borderRadius={"5px"}
                overflow={"hidden"}
                bg={"chakra-body-bg"}
              >
                {renderSearchResultList()}
              </Box>
              <Flex>
                <PlaceInfoView
                  isPlaceVisible={userConfig?.isPlaceVisible}
                  selectedPlaceCoordinate={userConfig?.selectedPlaceCoordinate}
                  placeItem={state?.placeItem}
                />
              </Flex>
            </Flex>
            <Flex flex={2} overflow={"visible"}>
              {state?.isAppLoaded &&
                (userConfig.viewMode === "globe" ? (
                  <MasterGlobeView />
                ) : (
                  <MapView />
                ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    );
  };

  return renderMasterContainer();
};

const mapStateToProps = (state) => {
  return {
    userConfig: state.userConfig,
    userPref: state.userPref,
    isMasterAppLoading: state.isMasterAppLoading,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setUserConfig: (userConfig) => dispatch(Actions.setUserConfig(userConfig)),
    setUserPref: (userPref) => dispatch(Actions.setUserPref(userPref)),
    setIsMasterAppLoading: (isMasterAppLoading) =>
      dispatch(Actions.setIsMasterAppLoading(isMasterAppLoading)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchPlaceView);
