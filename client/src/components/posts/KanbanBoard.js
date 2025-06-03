import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Button,
  HStack,
  Select,
  Spinner,
  Center,
  VStack,
  Heading,
  useBreakpointValue,
} from "@chakra-ui/react";
import { FaPlus, FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";
import PostCard from "./PostCard";

const KanbanBoard = ({ posts = [], isLoading, onCreatePost }) => {
  const [columns, setColumns] = useState([]);
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' or 'oldest'
  const [categoryFilter, setCategoryFilter] = useState("all");

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const columnBg = useColorModeValue("gray.100", "gray.800");
  const columnWidth = useBreakpointValue({ base: "100%", md: "300px" });
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Extract unique categories from posts
  const categories = [
    "all",
    ...new Set(
      posts.map((post) => post.category || "uncategorized").filter(Boolean),
    ),
  ];

  // Sort and filter posts
  useEffect(() => {
    if (!posts.length) {
      setColumns([]);
      return;
    }

    // Filter posts by category if needed
    let filteredPosts = posts;
    if (categoryFilter !== "all") {
      filteredPosts = posts.filter((post) => post.category === categoryFilter);
    }

    // Sort posts by date
    const sortedPosts = [...filteredPosts].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    // Group posts into columns (for desktop view)
    if (!isMobile) {
      const columnsCount = 3; // Number of columns in the kanban board
      const postsPerColumn = Math.ceil(sortedPosts.length / columnsCount);

      const newColumns = [];
      for (let i = 0; i < columnsCount; i++) {
        const startIndex = i * postsPerColumn;
        const columnPosts = sortedPosts.slice(
          startIndex,
          startIndex + postsPerColumn,
        );
        newColumns.push(columnPosts);
      }

      setColumns(newColumns);
    } else {
      // For mobile, just use a single column
      setColumns([sortedPosts]);
    }
  }, [posts, sortOrder, categoryFilter, isMobile]);

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "newest" ? "oldest" : "newest");
  };

  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!posts.length) {
    return (
      <Center py={10}>
        <VStack spacing={4}>
          <Heading size="md">No posts available</Heading>
          <Text>Be the first to share your experience!</Text>
          {onCreatePost && (
            <Button
              leftIcon={<FaPlus />}
              colorScheme="blue"
              onClick={onCreatePost}
            >
              Create Post
            </Button>
          )}
        </VStack>
      </Center>
    );
  }

  return (
    <Box w="100%" p={4} bg={bgColor} borderRadius="md">
      {/* Controls */}
      <HStack mb={4} justifyContent="space-between" flexWrap="wrap" spacing={2}>
        <HStack spacing={2}>
          <Button
            size="sm"
            leftIcon={
              sortOrder === "newest" ? <FaSortAmountDown /> : <FaSortAmountUp />
            }
            onClick={toggleSortOrder}
            variant="outline"
          >
            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
          </Button>

          {categories.length > 1 && (
            <Select
              size="sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              maxW="150px"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all"
                    ? "All Categories"
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </Select>
          )}
        </HStack>

        {onCreatePost && (
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            colorScheme="blue"
            onClick={onCreatePost}
          >
            Create Post
          </Button>
        )}
      </HStack>

      {/* Kanban Board */}
      <Flex
        flexWrap="wrap"
        justifyContent="space-around"
        alignItems="flex-start"
        gap={4}
      >
        {columns.map((columnPosts, columnIndex) => (
          <Flex
            key={columnIndex}
            direction="column"
            minW={columnWidth}
            maxW={isMobile ? "100%" : columnWidth}
            bg={columnBg}
            p={3}
            borderRadius="md"
            alignItems="center"
            flex={isMobile ? "1" : "0 0 auto"}
          >
            {columnPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                columnWidth={isMobile ? "100%" : columnWidth}
              />
            ))}
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default KanbanBoard;
