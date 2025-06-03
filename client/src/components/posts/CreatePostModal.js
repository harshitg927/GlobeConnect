import React, { useState, useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  Box,
  Image,
  Text,
  IconButton,
  useToast,
  Flex,
  useColorModeValue,
  Progress,
  Icon,
} from "@chakra-ui/react";
import { FaUpload, FaTimes, FaImage } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api`;
const MAX_CHAR_COUNT = 2000;

const CreatePostModal = ({ isOpen, onClose, locationInfo, onPostCreated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [characterCount, setCharacterCount] = useState(0);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { user, token } = useAuth();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Handle content change with character count
  const handleContentChange = (e) => {
    const text = e.target.value;
    if (text.length <= MAX_CHAR_COUNT) {
      setContent(text);
      setCharacterCount(text.length);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Preview images
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isUploading: false,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  // Handle image removal
  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const newImages = [...prev];
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });

    // Clear any error for this image
    setImageErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", content);

      // Add state name from location info
      if (locationInfo && locationInfo.state) {
        formData.append("stateName", locationInfo.state);
      } else if (locationInfo && locationInfo.city) {
        formData.append("stateName", locationInfo.city);
      } else if (locationInfo && locationInfo.country) {
        formData.append("stateName", locationInfo.country);
      } else {
        formData.append("stateName", "Unknown Location");
      }

      // Add images
      images.forEach((image) => {
        formData.append("images", image.file);
      });

      // Send request
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post(
        `${API_BASE_URL}/posts`,
        formData,
        config,
      );

      // Show success message
      toast({
        title: "Post created",
        description: "Your post has been created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Call callback function to refresh posts
      if (onPostCreated) {
        onPostCreated(response.data.data.post);
      }

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create post",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setContent("");
    setCharacterCount(0);

    // Revoke object URLs to prevent memory leaks
    images.forEach((image) => {
      URL.revokeObjectURL(image.preview);
    });
    setImages([]);
    setImageErrors({});
  };

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      // Revoke object URLs to prevent memory leaks
      images.forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });
    };
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>Create New Post</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your post"
                disabled={isSubmitting}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Content</FormLabel>
              <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Share your experience..."
                minH="150px"
                disabled={isSubmitting}
              />
              <Flex justify="flex-end" mt={1}>
                <Text
                  fontSize="sm"
                  color={
                    characterCount > MAX_CHAR_COUNT * 0.8
                      ? "orange.500"
                      : "gray.500"
                  }
                >
                  {characterCount}/{MAX_CHAR_COUNT}
                </Text>
              </Flex>
            </FormControl>

            <FormControl>
              <FormLabel>Images</FormLabel>
              <Box
                border="2px dashed"
                borderColor={borderColor}
                borderRadius="md"
                p={4}
                textAlign="center"
                cursor="pointer"
                onClick={() => fileInputRef.current.click()}
                _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  disabled={isSubmitting}
                />
                <VStack spacing={2}>
                  <Icon as={FaImage} boxSize={8} color="gray.400" />
                  <Text>Click to upload images</Text>
                  <Text fontSize="xs" color="gray.500">
                    You can upload multiple images
                  </Text>
                </VStack>
              </Box>

              {/* Image previews */}
              {images.length > 0 && (
                <Flex mt={4} flexWrap="wrap" gap={2}>
                  {images.map((image, index) => (
                    <Box
                      key={index}
                      position="relative"
                      width="100px"
                      height="100px"
                      borderRadius="md"
                      overflow="hidden"
                      borderWidth="1px"
                      borderColor={imageErrors[index] ? "red.500" : borderColor}
                    >
                      <Image
                        src={image.preview}
                        alt={`Preview ${index}`}
                        objectFit="cover"
                        w="100%"
                        h="100%"
                        onError={() => {
                          setImageErrors((prev) => ({
                            ...prev,
                            [index]: "Failed to load image",
                          }));
                        }}
                      />
                      {imageErrors[index] && (
                        <Box
                          position="absolute"
                          bottom="0"
                          w="100%"
                          bg="red.500"
                          color="white"
                          fontSize="xs"
                          p={1}
                          textAlign="center"
                        >
                          Error
                        </Box>
                      )}
                      <IconButton
                        icon={<FaTimes />}
                        size="xs"
                        colorScheme="red"
                        aria-label="Remove image"
                        position="absolute"
                        top={1}
                        right={1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        disabled={isSubmitting}
                      />
                    </Box>
                  ))}
                </Flex>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          {isSubmitting && (
            <Progress size="xs" isIndeterminate flex="1" mr={4} />
          )}
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Creating..."
          >
            Create Post
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreatePostModal;
