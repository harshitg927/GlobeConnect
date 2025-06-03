import React, { useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  VStack,
  Text,
  Button,
  Box,
  Flex,
  Spinner,
  useColorMode,
  useBreakpointValue,
} from "@chakra-ui/react";
import { BellIcon } from "@chakra-ui/icons";
import { useNotifications } from "../../context/NotificationContext";
import NotificationItem from "./NotificationItem";

const NotificationIcon = () => {
  const { notifications, unreadCount, loading, markAllAsRead } =
    useNotifications();
  const { colorMode } = useColorMode();
  const [isOpen, setIsOpen] = useState(false);

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const popoverWidth = useBreakpointValue({
    base: "90vw",
    sm: "400px",
    md: "400px",
  });
  const popoverMaxHeight = useBreakpointValue({ base: "70vh", md: "500px" });
  const popoverPlacement = useBreakpointValue({
    base: "bottom",
    md: "bottom-end",
  });
  const headerFontSize = useBreakpointValue({ base: "md", md: "lg" });
  const buttonSize = useBreakpointValue({ base: "xs", md: "sm" });
  const iconButtonSize = useBreakpointValue({ base: "sm", md: "md" });

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement={popoverPlacement}
      closeOnBlur={true}
      closeOnEsc={true}
    >
      <PopoverTrigger>
        <Box position="relative" display="inline-block">
          <IconButton
            aria-label="Notifications"
            icon={<BellIcon />}
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            size={iconButtonSize}
          />
          {unreadCount > 0 && (
            <Badge
              colorScheme="red"
              variant="solid"
              borderRadius="full"
              position="absolute"
              top={isMobile ? "0" : "-1"}
              right={isMobile ? "0" : "-1"}
              fontSize="xs"
              minW={isMobile ? "16px" : "20px"}
              h={isMobile ? "16px" : "20px"}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent
        w={popoverWidth}
        maxH={popoverMaxHeight}
        bg={colorMode === "dark" ? "gray.800" : "white"}
        borderColor={colorMode === "dark" ? "gray.600" : "gray.200"}
        mx={isMobile ? 2 : 0}
        zIndex={1500}
      >
        <PopoverCloseButton size={buttonSize} />
        <PopoverHeader fontWeight="bold" fontSize={headerFontSize} pr={8}>
          <Flex
            justify="space-between"
            align="center"
            direction={isMobile && unreadCount > 0 ? "column" : "row"}
            gap={isMobile && unreadCount > 0 ? 2 : 0}
          >
            <Text>Notifications</Text>
            {unreadCount > 0 && (
              <Button
                size={buttonSize}
                variant="ghost"
                colorScheme="blue"
                onClick={handleMarkAllAsRead}
                fontSize={isMobile ? "xs" : "sm"}
              >
                Mark all read
              </Button>
            )}
          </Flex>
        </PopoverHeader>
        <PopoverBody p={0}>
          {loading ? (
            <Flex
              justify="center"
              align="center"
              h={isMobile ? "80px" : "100px"}
            >
              <Spinner size={isMobile ? "md" : "lg"} />
            </Flex>
          ) : notifications.length === 0 ? (
            <Flex
              justify="center"
              align="center"
              h={isMobile ? "80px" : "100px"}
              p={4}
            >
              <Text
                color="gray.500"
                fontSize={isMobile ? "sm" : "md"}
                textAlign="center"
              >
                No notifications yet
              </Text>
            </Flex>
          ) : (
            <VStack
              spacing={0}
              align="stretch"
              maxH={isMobile ? "50vh" : "400px"}
              overflowY="auto"
            >
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id || notification.id}
                  notification={notification}
                />
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationIcon;
