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

const CreatePostModal = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const toast = useToast();
  const fileInputRef = useRef(null);

  const { user } = useAuth() || { user: { username: "guest" } };

  const bgColor = useColorModeValue("white", "#1A202C");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBgColor = useColorModeValue("white", "#2D3748");

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    e.target.value = null;
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
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

      files.forEach((file) => {
        formData.append("images", file);
      });

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      console.log("Submitting post with data:", {
        title: title.trim(),
        description: content.trim(),
        stateName: location.trim(),
        fileCount: files.length,
      });

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData
        },
        body: formData,
      });

      const responseText = await res.text();

      if (!res.ok) {
        let errorMessage = "Failed to create post";
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
        title: "Post created.",
        description: "Your post has been created successfully.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setFiles([]);
      setTitle("");
      setContent("");
      setLocation("");
      setShowSidebar(false);
      setCharCount(0);

      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error creating post.",
        description:
          error.message || "An error occurred while creating your post.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    if (files.length === 0) {
      return (
        <Flex
          direction="column"
          align="center"
          justify="center"
          p={10}
          border="2px dashed"
          borderColor={borderColor}
          borderRadius="md"
          width="100%"
          height="250px"
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
          <Text mt={4}>Drag photos and videos here</Text>
          <Button
            colorScheme="blue"
            size="sm"
            mt={4}
            onClick={() => fileInputRef.current?.click()}
          >
            Select From Computer
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            display="none"
          />
        </Flex>
      );
    }

    return (
      <Box
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        p={2}
        maxHeight="300px"
        overflowY="auto"
      >
        <Flex flexWrap="wrap" gap={2}>
          {files.map((file, index) => (
            <Box key={index} position="relative" width="100px" height="100px">
              <Image
                src={URL.createObjectURL(file)}
                alt={`Preview ${index}`}
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
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              />
              {index === 0 && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  bg="blackAlpha.600"
                  color="white"
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontSize="xs"
                  cursor="pointer"
                  onClick={() =>
                    document.getElementById("tagPeopleOverlay")?.focus()
                  }
                >
                  Tag People
                </Box>
              )}
            </Box>
          ))}
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
          >
            +
          </Flex>
          <Input id="tagPeopleOverlay" aria-label="Tag people" display="none" />
        </Flex>
      </Box>
    );
  };

  const renderSidebar = () => {
    return (
      <VStack
        w="300px"
        h="100%"
        borderLeft="1px solid"
        borderColor={borderColor}
        p={4}
        align="stretch"
        spacing={4}
      >
        <Flex align="center" mb={4}>
          <Avatar
            size="sm"
            src={user?.avatar}
            name={user?.username || "User"}
          />
          <Text ml={2} fontWeight="bold">
            {user?.username || "guest"}
          </Text>
        </Flex>

        <Box>
          <Text fontSize="sm" color="gray.500" mb={1}>
            {charCount}/2,200
          </Text>
        </Box>

        <VStack align="stretch" spacing={3}>
          <Box>
            <Text mb={1} fontWeight="medium">
              Add Location
            </Text>
            <InputGroup>
              <Input
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                bg={inputBgColor}
              />
              <InputRightElement>
                <FaLocationArrow />
              </InputRightElement>
            </InputGroup>
          </Box>
        </VStack>
      </VStack>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={showSidebar ? "4xl" : "xl"}
      isCentered
    >
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
          <Flex align="center">
            {showSidebar && (
              <IconButton
                icon={<ArrowBackIcon />}
                variant="ghost"
                mr={2}
                onClick={() => setShowSidebar(false)}
                aria-label="Go back"
              />
            )}
            Create new post
          </Flex>
          {!showSidebar && (
            <Button
              colorScheme="blue"
              variant="ghost"
              onClick={() => setShowSidebar(true)}
            >
              Next
            </Button>
          )}
        </ModalHeader>

        <IconButton
          icon={<CloseIcon />}
          position="absolute"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close modal"
          zIndex={1}
        />

        <Flex direction="row" maxH="70vh">
          <ModalBody p={4} flex="1" overflowY="auto">
            {!showSidebar ? (
              <>
                {renderPreview()}

                <Box mt={4}>
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    mb={2}
                    isRequired
                  />
                  <Textarea
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={handleContentChange}
                    resize="vertical"
                    rows={4}
                  />
                </Box>
              </>
            ) : (
              <Flex direction="column" h="100%">
                <Box flex="1" overflowY="auto">
                  {renderPreview()}

                  <Flex direction="column" mt={4}>
                    <Flex align="center" mb={4}>
                      <Avatar
                        size="sm"
                        src={user?.avatar}
                        name={user?.username || "User"}
                      />
                      <Text ml={2} fontWeight="bold">
                        {user?.username || "guest"}
                      </Text>
                    </Flex>

                    <Textarea
                      placeholder="What's on your mind?"
                      value={content}
                      onChange={handleContentChange}
                      resize="vertical"
                      rows={8}
                      border="none"
                      _focus={{ boxShadow: "none" }}
                      p={0}
                    />
                  </Flex>
                </Box>

                <HStack mt={4} justify="space-between">
                  <IconButton
                    icon={<MdEmojiEmotions size="24px" />}
                    variant="ghost"
                    aria-label="Add emoji"
                  />
                  <Text fontSize="sm" color="gray.500">
                    {charCount}/2,200
                  </Text>
                </HStack>
              </Flex>
            )}
          </ModalBody>

          {showSidebar && renderSidebar()}
        </Flex>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          {showSidebar && (
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isLoading}
              isDisabled={!location.trim() || !content.trim() || !title.trim()}
            >
              Post
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreatePostModal;
