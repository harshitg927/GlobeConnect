import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Flex,
  Text,
  Input,
  Textarea,
  useColorModeValue,
  IconButton,
  Image,
  useToast,
  Avatar,
  HStack,
  VStack,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { CloseIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { FaLocationArrow } from "react-icons/fa";
import { MdEmojiEmotions } from "react-icons/md";
import { useAuth } from "../../../context/AuthContext";

const EditPostModal = ({ isOpen, onClose, post, onPostUpdated }) => {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // Start with sidebar open
  const [charCount, setCharCount] = useState(0);
  const toast = useToast();
  const fileInputRef = useRef(null);

  const { user } = useAuth() || { user: { username: "guest" } };

  const bgColor = useColorModeValue("white", "#1A202C");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBgColor = useColorModeValue("white", "#2D3748");

  // Initialize form with post data
  useEffect(() => {
    if (post && isOpen) {
      console.log("Initializing with post:", post);
      setTitle(post.title || "");
      setContent(post.description || "");
      setLocation(post.stateName || "");
      setExistingImages(post.images || []);
      setCharCount(post.description?.length || 0);
      setFiles([]);
      setImagesToDelete([]);
      setShowSidebar(true);
    }
  }, [post, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setContent("");
      setLocation("");
      setExistingImages([]);
      setFiles([]);
      setImagesToDelete([]);
      setCharCount(0);
      setShowSidebar(true);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    e.target.value = null;
  };

  const removeNewFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const removeExistingImage = (imageUrl) => {
    setExistingImages((prev) => prev.filter((img) => img !== imageUrl));
    setImagesToDelete((prev) => [...prev, imageUrl]);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title to your post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please add some content to your post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: "Location required",
        description: "Please add a location to your post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();

      formData.append("title", title.trim());
      formData.append("description", content.trim());
      formData.append("stateName", location.trim());

      // Add new files
      files.forEach((file) => {
        formData.append("images", file);
      });

      // Add images to delete - convert to JSON string
      if (imagesToDelete.length > 0) {
        formData.append("deleteImages", JSON.stringify(imagesToDelete));
      }

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      console.log("Updating post with data:", {
        title: title.trim(),
        description: content.trim(),
        stateName: location.trim(),
        newFileCount: files.length,
        imagesToDelete: imagesToDelete.length,
      });

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/posts/${post._id || post.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData
          },
          body: formData,
        },
      );

      const responseText = await res.text();

      if (!res.ok) {
        let errorMessage = "Failed to update post";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = {};
      }

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Call the callback to refresh the posts list
      if (onPostUpdated) {
        onPostUpdated();
      }

      onClose();
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error updating post",
        description:
          error.message || "An error occurred while updating your post.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    const totalImages = existingImages.length + files.length;

    if (totalImages === 0) {
      return (
        <Flex
          direction="column"
          align="center"
          justify="center"
          p={8}
          border="2px dashed"
          borderColor={borderColor}
          borderRadius="md"
          width="100%"
          height="200px"
          onClick={() => fileInputRef.current?.click()}
          cursor="pointer"
          _hover={{ bg: "gray.50" }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="10"
              y="8"
              width="20"
              height="22"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M18 22L22 18M22 18L26 22M22 18V30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="18"
              y="18"
              width="20"
              height="22"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <Text mt={4} color="gray.500">
            Add photos and videos
          </Text>
          <Text fontSize="sm" color="gray.400">
            Click to select from computer
          </Text>
        </Flex>
      );
    }

    return (
      <Box
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        p={2}
        maxHeight="250px"
        overflowY="auto"
      >
        <Flex flexWrap="wrap" gap={2}>
          {/* Existing Images */}
          {existingImages.map((imageUrl, index) => (
            <Box
              key={`existing-${index}`}
              position="relative"
              width="100px"
              height="100px"
            >
              <Image
                src={`${process.env.REACT_APP_API_URL}${imageUrl}`}
                alt={`Existing ${index}`}
                objectFit="cover"
                width="100%"
                height="100%"
                borderRadius="md"
                onError={(e) => {
                  console.error("Failed to load image:", imageUrl);
                  e.target.style.display = "none";
                }}
              />
              <IconButton
                icon={<CloseIcon />}
                size="xs"
                position="absolute"
                top={1}
                right={1}
                colorScheme="red"
                onClick={() => removeExistingImage(imageUrl)}
                aria-label="Remove existing image"
              />
            </Box>
          ))}

          {/* New Files */}
          {files.map((file, index) => (
            <Box
              key={`new-${index}`}
              position="relative"
              width="100px"
              height="100px"
            >
              <Image
                src={URL.createObjectURL(file)}
                alt={`New ${index}`}
                objectFit="cover"
                width="100%"
                height="100%"
                borderRadius="md"
              />
              <IconButton
                icon={<CloseIcon />}
                size="xs"
                position="absolute"
                top={1}
                right={1}
                colorScheme="red"
                onClick={() => removeNewFile(index)}
                aria-label="Remove new file"
              />
            </Box>
          ))}

          {/* Add More Button */}
          <Flex
            justify="center"
            align="center"
            width="100px"
            height="100px"
            border="1px dashed"
            borderColor={borderColor}
            borderRadius="md"
            onClick={() => fileInputRef.current?.click()}
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
          >
            <Text fontSize="2xl" color="gray.400">
              +
            </Text>
          </Flex>
        </Flex>
      </Box>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh" position="relative">
        <ModalHeader
          borderBottom="1px solid"
          borderColor={borderColor}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          pr={12}
        >
          <Text fontWeight="bold">Edit Post</Text>
        </ModalHeader>

        <ModalCloseButton />

        <Flex direction="row" maxH="70vh">
          {/* Main Content */}
          <ModalBody p={6} flex="1" overflowY="auto">
            {/* Title Input */}
            <Box mb={4}>
              <Text mb={2} fontWeight="medium">
                Title
              </Text>
              <Input
                placeholder="Enter post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg={inputBgColor}
                isRequired
              />
            </Box>

            {/* Image Preview */}
            <Box mb={4}>
              <Text mb={2} fontWeight="medium">
                Images
              </Text>
              {renderPreview()}
            </Box>

            {/* Description */}
            <Box mb={4}>
              <Text mb={2} fontWeight="medium">
                Description
              </Text>
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={handleContentChange}
                resize="vertical"
                rows={6}
                bg={inputBgColor}
              />
              <Text fontSize="sm" color="gray.500" mt={1} textAlign="right">
                {charCount}/2,200
              </Text>
            </Box>

            {/* Location */}
            <Box>
              <Text mb={2} fontWeight="medium">
                Location
              </Text>
              <InputGroup>
                <Input
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  bg={inputBgColor}
                />
                <InputRightElement>
                  <FaLocationArrow color="gray.500" />
                </InputRightElement>
              </InputGroup>
            </Box>
          </ModalBody>
        </Flex>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!location.trim() || !content.trim() || !title.trim()}
          >
            Update Post
          </Button>
        </ModalFooter>

        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          display="none"
        />
      </ModalContent>
    </Modal>
  );
};

export default EditPostModal;
