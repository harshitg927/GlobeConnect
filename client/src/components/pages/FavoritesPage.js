import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Text,
  IconButton,
  useToast,
  Spinner,
  Center,
  Flex,
  Badge,
  useColorModeValue,
  Button,
  useBreakpointValue,
  Stack,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  StarIcon,
  DeleteIcon,
  ViewIcon,
  ArrowBackIcon,
} from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getFavorites,
  removeFromFavorites,
} from "../../services/favoritesService";
import NavBarView from "../../comp/screen/navbar";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerMaxW = useBreakpointValue({
    base: "100%",
    md: "container.xl",
  });
  const containerPadding = useBreakpointValue({ base: 4, md: 8 });
  const headingSize = useBreakpointValue({ base: "md", md: "lg" });
  const cardDirection = useBreakpointValue({ base: "column", md: "row" });
  const buttonSize = useBreakpointValue({ base: "sm", md: "md" });
  const gridColumns = useBreakpointValue({ base: 1, md: 2, lg: 3 });

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await getFavorites();
      setFavorites(response.data.favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      setDeletingId(favoriteId);
      await removeFromFavorites(favoriteId);
      setFavorites(favorites.filter((fav) => fav._id !== favoriteId));
      toast({
        title: "Removed from favorites",
        description: "State has been removed from your favorites",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewLocation = (favorite) => {
    navigate(`/location/${favorite.latitude}/${favorite.longitude}`);
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <Box
        width="100vw"
        height="100vh"
        position="fixed"
        bg={useColorModeValue("gray.50", "gray.900")}
      >
        <NavBarView />
        <Center h="calc(100vh - 64px)">
          <Spinner size="xl" />
        </Center>
      </Box>
    );
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      position="fixed"
      bg={useColorModeValue("gray.50", "gray.900")}
    >
      <NavBarView />
      <Box h="calc(100vh - 64px)" overflowY="auto">
        <Container
          maxW={containerMaxW}
          py={containerPadding}
          px={isMobile ? 4 : 8}
        >
          <Stack
            direction={isMobile ? "column" : "row"}
            align={isMobile ? "stretch" : "center"}
            mb={6}
            spacing={isMobile ? 3 : 0}
          >
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              onClick={handleBackToHome}
              mr={isMobile ? 0 : 4}
              size={buttonSize}
              alignSelf={isMobile ? "flex-start" : "center"}
            >
              Back to Home
            </Button>
            <Flex
              align="center"
              justify={isMobile ? "space-between" : "flex-start"}
              w="100%"
            >
              <Heading size={headingSize}>My Favorite States</Heading>
              <Badge
                ml={3}
                colorScheme="blue"
                fontSize={isMobile ? "sm" : "md"}
              >
                {favorites.length}
              </Badge>
            </Flex>
          </Stack>

          {favorites.length === 0 ? (
            <Center>
              <VStack spacing={4} textAlign="center" p={isMobile ? 4 : 8}>
                <StarIcon boxSize={isMobile ? 8 : 12} color="gray.400" />
                <Heading size={isMobile ? "sm" : "md"} color="gray.500">
                  No favorite states yet
                </Heading>
                <Text
                  color="gray.500"
                  fontSize={isMobile ? "sm" : "md"}
                  textAlign="center"
                >
                  Start exploring states and add them to your favorites!
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={handleBackToHome}
                  size={buttonSize}
                  mt={2}
                >
                  Explore States
                </Button>
              </VStack>
            </Center>
          ) : (
            <SimpleGrid columns={gridColumns} spacing={4}>
              {favorites.map((favorite) => (
                <Card
                  key={favorite._id}
                  bg={bgColor}
                  borderColor={borderColor}
                  borderWidth="1px"
                  _hover={{ boxShadow: "md" }}
                  transition="all 0.2s"
                  h="fit-content"
                >
                  <CardBody p={isMobile ? 4 : 6}>
                    <VStack align="stretch" spacing={3}>
                      <VStack align="start" spacing={2} flex={1}>
                        <Heading size={isMobile ? "sm" : "md"} noOfLines={2}>
                          {favorite.state ||
                            favorite.city ||
                            favorite.country ||
                            "Unknown Location"}
                        </Heading>
                        {favorite.displayName && (
                          <Text
                            color={useColorModeValue("gray.600", "gray.400")}
                            fontSize="sm"
                            noOfLines={2}
                          >
                            {favorite.displayName}
                          </Text>
                        )}
                        <VStack align="start" spacing={1} w="100%">
                          {favorite.state && (
                            <Text fontSize="xs" color="gray.500">
                              State: {favorite.state}
                            </Text>
                          )}
                          {favorite.country && (
                            <Text fontSize="xs" color="gray.500">
                              Country: {favorite.country}
                            </Text>
                          )}
                          <Text fontSize="xs" color="gray.500">
                            Added:{" "}
                            {new Date(favorite.addedAt).toLocaleDateString()}
                          </Text>
                        </VStack>
                      </VStack>

                      <Stack
                        direction={isMobile ? "column" : "row"}
                        spacing={2}
                        w="100%"
                        pt={2}
                      >
                        <Button
                          leftIcon={<ViewIcon />}
                          colorScheme="blue"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLocation(favorite)}
                          flex={isMobile ? "1" : "none"}
                        >
                          View Location
                        </Button>
                        <Button
                          leftIcon={<DeleteIcon />}
                          colorScheme="red"
                          variant="outline"
                          size="sm"
                          isLoading={deletingId === favorite._id}
                          onClick={() => handleRemoveFavorite(favorite._id)}
                          flex={isMobile ? "1" : "none"}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default FavoritesPage;
