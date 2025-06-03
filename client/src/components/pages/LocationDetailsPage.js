import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Actions from "../../comp/redux/action";
import {
  Box,
  Container,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Flex,
  Text,
  Spinner,
  Badge,
  useColorModeValue,
  VStack,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useDisclosure,
  useToast,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";
import { useParams } from "react-router-dom";
import NavBarView from "../../comp/screen/navbar";
import { getLocationFromCoordinates } from "../../comp/utils/geocoding";
import { useLocationHistory } from "../../hooks/useLocationHistory";
import { useAuth } from "../../context/AuthContext";
import KanbanBoard from "../../components/posts/KanbanBoard";
import CreatePostModal from "../../components/posts/CreatePostModal";
import { initSocket } from "../../utils/socket";
import { FaPlus } from "react-icons/fa";
import {
  addToFavorites,
  removeFromFavorites,
  checkFavoriteByState,
} from "../../services/favoritesService";

const LocationDetailsPage = ({ setIsMasterAppLoading }) => {
  const { lat, lng } = useParams();
  const [locationInfo, setLocationInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  const authContext = useAuth();
  const user = authContext?.user || null;
  const {
    isOpen: isCreateModalOpen,
    onOpen: onCreateModalOpen,
    onClose: onCreateModalClose,
  } = useDisclosure();
  const toast = useToast();

  // Initialize socket connection
  useEffect(() => {
    // Initialize socket connection when component mounts
    const socket = initSocket();

    // Listen for post updates
    socket.on("post-update", (updatedPost) => {
      console.log("Received post update:", updatedPost);
      setPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post._id === updatedPost._id) {
            return { ...post, ...updatedPost };
          }
          return post;
        });
      });
    });

    // Listen for like updates
    socket.on("like-update", (data) => {
      console.log("Received like update:", data);
      setPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post._id === data.postId) {
            return { ...post, likes: data.likes };
          }
          return post;
        });
      });
    });

    return () => {
      // Clean up socket listeners when component unmounts
      socket.off("post-update");
      socket.off("like-update");
    };
  }, []);

  // Fetch location info
  useEffect(() => {
    const fetchLocationInfo = async () => {
      // Debug logging
      console.log("LocationDetailsPage: Starting fetch for coordinates:", {
        lat,
        lng,
      });

      // Validate coordinates
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        console.error("Invalid coordinates:", {
          lat,
          lng,
          latitude,
          longitude,
        });
        setIsMasterAppLoading(false);
        setIsLoading(false);
        return;
      }

      console.log("LocationDetailsPage: Valid coordinates:", {
        latitude,
        longitude,
      });
      setIsLoading(true);

      try {
        console.log(
          "LocationDetailsPage: Calling getLocationFromCoordinates..."
        );
        const data = await getLocationFromCoordinates({
          latitude,
          longitude,
        });

        console.log("LocationDetailsPage: Received location data:", data);
        setLocationInfo(data);

        if (data && data.state) {
          console.log(
            "LocationDetailsPage: Fetching posts for state:",
            data.state
          );
          await fetchPosts(data.state.toLowerCase());
        } else {
          console.log("LocationDetailsPage: No state found in location data");
        }

        // Set loading to false after everything is loaded
        setIsMasterAppLoading(false);
        setIsLoading(false);
      } catch (error) {
        console.error("LocationDetailsPage: Error fetching location:", error);
        setIsMasterAppLoading(false);
        setIsLoading(false);
      }
    };

    fetchLocationInfo();
  }, [lat, lng, setIsMasterAppLoading]);

  // Check if state is in favorites when user is logged in and location info is available
  useEffect(() => {
    const checkIfFavorite = async () => {
      if (user && locationInfo && locationInfo.state) {
        try {
          setIsLoadingFavorite(true);
          const response = await checkFavoriteByState(locationInfo.state);
          setIsFavorite(response.data.isFavorite);
          if (response.data.favorite) {
            setFavoriteId(response.data.favorite._id);
          }
        } catch (error) {
          console.error("Error checking favorite status:", error);
        } finally {
          setIsLoadingFavorite(false);
        }
      }
    };

    checkIfFavorite();
  }, [user, locationInfo]);

  // Function to fetch posts
  const fetchPosts = async (stateName) => {
    console.log(
      "LocationDetailsPage: fetchPosts called with state:",
      stateName
    );
    setIsLoading(true);

    try {
      const url = `${
        process.env.REACT_APP_API_URL
      }/api/posts/state/${encodeURIComponent(stateName)}`;
      console.log("LocationDetailsPage: Making request to URL:", url);

      const response = await fetch(url);
      console.log("LocationDetailsPage: Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("LocationDetailsPage: Response data:", data);

      if (data.status === "success" && Array.isArray(data.data.posts)) {
        console.log(
          "LocationDetailsPage: Setting posts:",
          data.data.posts.length,
          "posts"
        );
        // Ensure we're setting the entire posts array
        setPosts(data.data.posts);
        // Set loading to false after posts are loaded
        setIsMasterAppLoading(false);
      } else {
        console.log("LocationDetailsPage: Invalid data structure or no posts");
        setPosts([]);
        console.error("API returned unexpected data structure:", data);
      }
    } catch (error) {
      console.error("LocationDetailsPage: Error fetching posts:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new post
  const handleCreatePost = () => {
    // Open create post modal
    onCreateModalOpen();
  };

  // Handle adding/removing from favorites
  const handleFavoriteToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add locations to favorites",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!locationInfo || !locationInfo.state) {
      toast({
        title: "Error",
        description: "State information not available for this location",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoadingFavorite(true);

      if (isFavorite && favoriteId) {
        // Remove from favorites
        await removeFromFavorites(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
        toast({
          title: "Removed from favorites",
          description: `${locationInfo.state} has been removed from your favorite states`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Add to favorites
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
          toast({
            title: "Error",
            description: "Invalid location coordinates",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        const favoriteData = {
          latitude,
          longitude,
          city: locationInfo.city,
          state: locationInfo.state,
          country: locationInfo.country,
          displayName: locationInfo.displayName,
        };

        const response = await addToFavorites(favoriteData);
        setIsFavorite(true);
        setFavoriteId(response.data.favorite._id);
        toast({
          title: "Added to favorites",
          description: `${locationInfo.state} has been added to your favorite states`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update favorites",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useLocationHistory(
    locationInfo?.state || locationInfo?.country || locationInfo?.city
  );

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tabBg = useColorModeValue("gray.100", "gray.700");
  const activeTabBg = useColorModeValue("white", "gray.800");

  // Refresh posts data
  const refreshPosts = async () => {
    if (locationInfo?.state) {
      await fetchPosts(locationInfo.state.toLowerCase());
    }
  };

  // Handle post creation success
  const handlePostCreated = (newPost) => {
    // Add the new post to the posts array
    setPosts((prevPosts) => [newPost, ...prevPosts]);

    toast({
      title: "Post created",
      description: "Your post has been created successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      position="fixed"
      bg={useColorModeValue("gray.50", "gray.900")}
    >
      <NavBarView />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={onCreateModalClose}
        locationInfo={{
          city: locationInfo?.city,
          state: locationInfo?.state,
          country: locationInfo?.country,
          latitude: !isNaN(parseFloat(lat)) ? parseFloat(lat) : 0,
          longitude: !isNaN(parseFloat(lng)) ? parseFloat(lng) : 0,
        }}
        onPostCreated={handlePostCreated}
      />
      <Flex direction="column" h="calc(100vh - 64px)">
        <Box
          py={6}
          px={4}
          bg={bgColor}
          borderBottomWidth="1px"
          borderColor={borderColor}
        >
          <Container maxW="container.xl">
            <Flex direction="column" align="center">
              <Flex align="center" gap={4} mb={2}>
                <Heading size="lg">
                  {locationInfo?.state ||
                    locationInfo?.city ||
                    locationInfo?.country ||
                    "Location"}
                </Heading>
                {user && (
                  <Tooltip
                    label={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                  >
                    <IconButton
                      icon={<StarIcon />}
                      colorScheme={isFavorite ? "yellow" : "gray"}
                      variant={isFavorite ? "solid" : "outline"}
                      size="md"
                      isLoading={isLoadingFavorite}
                      onClick={handleFavoriteToggle}
                      aria-label={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    />
                  </Tooltip>
                )}
              </Flex>
              <Text
                fontSize="md"
                color={useColorModeValue("gray.600", "gray.400")}
                textAlign="center"
              >
                {locationInfo?.displayName}
              </Text>
            </Flex>
          </Container>
        </Box>

        <Box flex="1" position="relative" overflow="hidden">
          <Container maxW="container.xl" h="100%" py={4}>
            <Tabs
              isFitted
              variant="enclosed"
              display="flex"
              flexDirection="column"
              h="100%"
            >
              <TabList>
                <Tab
                  _selected={{
                    bg: activeTabBg,
                    borderBottom: "2px solid",
                    borderColor: "blue.500",
                  }}
                >
                  Posts
                </Tab>
                <Tab
                  _selected={{
                    bg: activeTabBg,
                    borderBottom: "2px solid",
                    borderColor: "blue.500",
                  }}
                >
                  History
                </Tab>
              </TabList>

              <TabPanels flex="1" overflow="hidden">
                <TabPanel h="100%" p={0}>
                  <Box
                    h="100%"
                    overflowY="auto"
                    pt={4}
                    sx={{
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-track": { width: "6px" },
                      "&::-webkit-scrollbar-thumb": {
                        background: useColorModeValue("gray.300", "gray.600"),
                        borderRadius: "24px",
                      },
                    }}
                  >
                    <KanbanBoard
                      posts={posts}
                      isLoading={isLoading}
                      onCreatePost={user ? handleCreatePost : undefined}
                    />
                  </Box>
                </TabPanel>

                <TabPanel h="100%" p={0}>
                  <Box
                    h="100%"
                    overflowY="auto"
                    pt={4}
                    sx={{
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-track": { width: "6px" },
                      "&::-webkit-scrollbar-thumb": {
                        background: useColorModeValue("gray.300", "gray.600"),
                        borderRadius: "24px",
                      },
                    }}
                  >
                    <VStack spacing={4} align="stretch" pb={4}>
                      {isHistoryLoading ? (
                        <Flex justify="center" p={8}>
                          <Spinner size="xl" />
                        </Flex>
                      ) : historyError ? (
                        <Alert status="error">
                          <AlertIcon />
                          <AlertTitle>Error loading history</AlertTitle>
                          <AlertDescription>{historyError}</AlertDescription>
                        </Alert>
                      ) : history ? (
                        <Box
                          bg={bgColor}
                          p={6}
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor={borderColor}
                          shadow="sm"
                        >
                          {history.thumbnail && (
                            <Image
                              src={history.thumbnail}
                              alt={history.title}
                              maxH="200px"
                              objectFit="cover"
                              borderRadius="md"
                            />
                          )}
                          <Heading size="md" mt={4}>
                            {history.title}
                          </Heading>
                          <Text
                            color={useColorModeValue("gray.600", "gray.300")}
                            mt={2}
                          >
                            {history.extract}
                          </Text>
                        </Box>
                      ) : (
                        <Text color="gray.500" textAlign="center">
                          No historical information available
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setIsMasterAppLoading: (loading) =>
    dispatch(Actions.setIsMasterAppLoading(loading)),
});

export default connect(null, mapDispatchToProps)(LocationDetailsPage);
