import React, { useState, useEffect } from "react";
import {
  Box,
  Image,
  Text,
  Heading,
  Stack,
  HStack,
  VStack,
  Avatar,
  IconButton,
  useColorModeValue,
  Flex,
  Spacer,
  Badge,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FaComment, FaMapMarkerAlt, FaCalendarAlt, FaHeart, FaRegHeart } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import CommentSection from "../comments/CommentSection";
import { joinPostRoom, leavePostRoom, getSocket, initSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api`;

const PostCard = ({ post, columnWidth = "300px" }) => {
  const { isOpen, onToggle } = useDisclosure();
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const [likes, setLikes] = useState(Array.isArray(post.likes) ? post.likes : []);
  const [isLiking, setIsLiking] = useState(false);
  const { user, token } = useAuth();
  const toast = useToast();

  // Initialize socket connection and join post room
  useEffect(() => {
    const socket = initSocket();
    
    // Join post room immediately
    joinPostRoom(post._id);
    
    const handleLikeUpdate = (data) => {
      console.log("Received like update:", data);
      if (data.postId === post._id && Array.isArray(data.likes)) {
        setLikes(data.likes);
      }
    };

    socket.on("like-update", handleLikeUpdate);
    socket.on("connect", () => {
      console.log("Socket connected, joining post room:", post._id);
      joinPostRoom(post._id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      console.log("Cleaning up socket listeners for post:", post._id);
      leavePostRoom(post._id);
      socket.off("like-update", handleLikeUpdate);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [post._id]);

  // Join/leave post room when comments are opened/closed
  const handleToggleComments = () => {
    if (!isOpen) {
      joinPostRoom(post._id);
    } else {
      leavePostRoom(post._id);
    }
    onToggle();
  };

  // Handle like/unlike
  const handleToggleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like posts",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLiking(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      };

      const response = await axios.post(`${API_BASE_URL}/posts/${post._id}/like`, {}, config);
      console.log("Like response:", response.data);
      
      // Update likes immediately for better UX
      if (response.data.status === "success" && Array.isArray(response.data.data.likes)) {
        setLikes(response.data.data.likes);
        
        // Emit like update to other clients
        const socket = getSocket();
        if (socket) {
          socket.emit("like-update", {
            postId: post._id,
            likes: response.data.data.likes
          });
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to toggle like",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLiking(false);
    }
  };

  // Check if current user has liked the post
  const hasLiked = user && Array.isArray(likes) ? likes.some((like) => like.toString() === user._id) : false;

  return (
    <Box
      width={columnWidth}
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      shadow="sm"
      _hover={{ shadow: "md" }}
      transition="all 0.2s"
    >
      <Stack spacing={0}>
        {/* Post Image */}
        {post.images && post.images.length > 0 && (
          <Box position="relative" height="200px">
            <Image
              src={post.images[0]}
              alt={post.title}
              objectFit="cover"
              width="100%"
              height="100%"
            />
          </Box>
        )}

        {/* Post Content */}
        <Box p={4}>
          <Stack spacing={3}>
            <Heading size="md" noOfLines={2}>
              {post.title}
            </Heading>
            <Text color={textColor} noOfLines={3}>
              {post.description}
            </Text>

            {/* Location Badge */}
            {post.stateName && (
              <HStack>
                <FaMapMarkerAlt size="0.8em" />
                <Badge colorScheme="blue" variant="subtle">
                  {post.stateName}
                </Badge>
              </HStack>
            )}

            {/* Author and Time */}
            <HStack mt={2} spacing={2}>
              <Avatar
                size="xs"
                name={post.author?.username || post.user?.name}
                src={post.author?.avatar || post.user?.avatar}
              />
              <Text fontSize="xs" color="gray.500">
                {post.author?.username || post.user?.name || "Anonymous"}
              </Text>
              <Spacer />
              <HStack spacing={1}>
                <FaCalendarAlt size="0.7em" />
                <Text fontSize="xs" color="gray.500">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </Text>
              </HStack>
            </HStack>

            {/* Like and Comment Actions */}
            <Flex mt={2} align="center" justify="space-between">
              <HStack spacing={1}>
                <IconButton
                  icon={hasLiked ? <FaHeart color="red" /> : <FaRegHeart />}
                  aria-label={hasLiked ? "Unlike" : "Like"}
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLike}
                  isLoading={isLiking}
                  isDisabled={!user}
                />
                <Text fontSize="sm">{Array.isArray(likes) ? likes.length : 0}</Text>
              </HStack>

              <HStack spacing={1} onClick={handleToggleComments} cursor="pointer">
                <IconButton
                  icon={<FaComment />}
                  aria-label="Comments"
                  variant="ghost"
                  size="sm"
                />
                <Text fontSize="sm">{post.comments?.length || 0}</Text>
              </HStack>
            </Flex>
          </Stack>
        </Box>
      </Stack>

      {/* Comment Section (Collapsible) */}
      <CommentSection
        postId={post._id}
        initialComments={post.comments}
        initialLikes={likes}
        isOpen={isOpen}
        onToggle={handleToggleComments}
      />
    </Box>
  );
};

export default PostCard;
