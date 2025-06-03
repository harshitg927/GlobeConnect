import React, { useState, useEffect } from "react";
import { IconButton, Text, HStack, Tooltip, useToast } from "@chakra-ui/react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { getSocket } from "../../utils/socket";

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api`;

const LikeButton = ({ postId, initialLikes = [] }) => {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiking, setIsLiking] = useState(false);
  const { user, token } = useAuth();
  const toast = useToast();

  // Listen for like updates via socket
  useEffect(() => {
    const socket = getSocket();

    const handleLikeUpdate = (data) => {
      if (data.postId === postId) {
        setLikes(data.likes);
      }
    };

    socket.on("like-update", handleLikeUpdate);

    return () => {
      socket.off("like-update", handleLikeUpdate);
    };
  }, [postId]);

  // Check if current user has liked the post
  const hasLiked = user
    ? likes.some((like) => like.toString() === user._id)
    : false;

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
        },
      };

      await axios.post(`${API_BASE_URL}/posts/${postId}/like`, {}, config);
      // Likes will be updated via socket.io
    } catch (error) {
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

  return (
    <HStack spacing={1}>
      <Tooltip label={user ? (hasLiked ? "Unlike" : "Like") : "Log in to like"}>
        <IconButton
          icon={hasLiked ? <FaHeart color="red" /> : <FaRegHeart />}
          aria-label={hasLiked ? "Unlike" : "Like"}
          variant="ghost"
          size="sm"
          onClick={handleToggleLike}
          isLoading={isLiking}
          isDisabled={!user}
        />
      </Tooltip>
      <Text fontSize="sm">{likes.length}</Text>
    </HStack>
  );
};

export default LikeButton;
