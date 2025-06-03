import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Avatar,
  Divider,
  useColorModeValue,
  IconButton,
  Flex,
  useToast,
  Collapse,
  Badge,
} from "@chakra-ui/react";
import {
  FaTrash,
  FaReply,
  FaHeart,
  FaRegHeart,
  FaComment,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { joinPostRoom, leavePostRoom, getSocket } from "../../utils/socket";
import axios from "axios";

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api`;


const CommentSection = ({
  postId,
  initialComments = [],
  initialLikes = [],
  isOpen,
  onToggle,
}) => {
  const [comments, setComments] = useState(initialComments);
  const [likes, setLikes] = useState(initialLikes);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, token } = useAuth();
  const toast = useToast();
  const commentInputRef = useRef(null);
  const commentsEndRef = useRef(null);
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Scroll to bottom of comments when new ones are added
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && comments.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [comments.length, isOpen]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const socket = getSocket();
    joinPostRoom(postId);

    // Listen for new comments
    socket.on("comment-added", (data) => {
      if (data.postId === postId) {
        setComments((prevComments) => [data.comment, ...prevComments]);
        toast({
          title: "New comment",
          description: "Someone commented on this post",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "bottom-right",
        });
      }
    });

    // Listen for deleted comments
    socket.on("comment-deleted", (data) => {
      if (data.postId === postId) {
        setComments((prevComments) =>
          prevComments.filter((comment) => comment._id !== data.commentId),
        );
      }
    });

    // Listen for like updates
    socket.on("like-update", (data) => {
      if (data.postId === postId) {
        setLikes(data.likes);
      }
    });

    return () => {
      leavePostRoom(postId);
      socket.off("comment-added");
      socket.off("comment-deleted");
      socket.off("like-update");
    };
  }, [postId, isOpen, toast]);

  // Handle comment submission
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.post(
        `${API_BASE_URL}/posts/${postId}/comments`,
        { text: newComment },
        config,
      );

      // The comment will be added via socket.io
      setNewComment("");
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add comment",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.delete(
        `${API_BASE_URL}/posts/${postId}/comments/${commentId}`,
        config,
      );

      // The comment will be removed via socket.io
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete comment",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle like/unlike
  const handleToggleLike = async () => {
    try {
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
    }
  };

  // Check if current user has liked the post
  const hasLiked = user
    ? likes.some((like) => like.toString() === user._id)
    : false;

  return (
    <Collapse in={isOpen} animateOpacity>
      <Box
        p={4}
        bg={bgColor}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
        mt={2}
        boxShadow="sm"
      >
        {/* Comment count */}
        <Flex mb={4} justifyContent="flex-end">
          <HStack>
            <FaComment />
            <Text fontSize="sm">{comments.length} comments</Text>
          </HStack>
        </Flex>

        <Divider mb={4} />

        {/* Comment input */}
        {user ? (
          <form onSubmit={handleSubmitComment}>
            <HStack mb={4}>
              <Avatar
                size="sm"
                name={user.username || user.name}
                src={user.avatar}
              />
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                ref={commentInputRef}
                disabled={isSubmitting}
              />
              <Button
                colorScheme="blue"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                isDisabled={!newComment.trim()}
              >
                Post
              </Button>
            </HStack>
          </form>
        ) : (
          <Text fontSize="sm" color="gray.500" textAlign="center" mb={4}>
            Please log in to comment
          </Text>
        )}

        {/* Comments list */}
        <VStack
          align="stretch"
          spacing={4}
          maxH="300px"
          overflowY="auto"
          pr={2}
        >
          {comments.length > 0 ? (
            comments.map((comment) => (
              <Box
                key={comment._id}
                p={2}
                borderRadius="md"
                bg={useColorModeValue("gray.50", "gray.700")}
              >
                <HStack justify="space-between" mb={1}>
                  <HStack>
                    <Avatar
                      size="xs"
                      name={comment.user?.username || comment.name}
                      src={comment.user?.avatar || comment.avatar}
                    />
                    <Text fontWeight="bold" fontSize="sm">
                      {comment.user?.username || comment.name}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </Text>
                </HStack>
                <Text fontSize="sm" ml={8}>
                  {comment.text}
                </Text>

                {/* Delete button (only for comment owner) */}
                {user && user._id === (comment.user?._id || comment.user) && (
                  <Flex justify="flex-end" mt={1}>
                    <IconButton
                      icon={<FaTrash />}
                      aria-label="Delete comment"
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDeleteComment(comment._id)}
                    />
                  </Flex>
                )}
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color="gray.500" textAlign="center">
              No comments yet. Be the first to comment!
            </Text>
          )}
          <div ref={commentsEndRef} />
        </VStack>
      </Box>
    </Collapse>
  );
};

export default CommentSection;
