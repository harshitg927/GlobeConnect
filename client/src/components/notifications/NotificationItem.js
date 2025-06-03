import React from "react";
import {
  Box,
  Flex,
  Text,
  IconButton,
  useColorMode,
  Badge,
  Tooltip,
  useBreakpointValue,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";

const NotificationItem = ({ notification }) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const { colorMode } = useColorMode();

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const padding = useBreakpointValue({ base: 2, md: 3 });
  const titleFontSize = useBreakpointValue({ base: "xs", md: "sm" });
  const messageFontSize = useBreakpointValue({ base: "xs", md: "sm" });
  const metaFontSize = useBreakpointValue({ base: "2xs", md: "xs" });
  const iconButtonSize = useBreakpointValue({ base: "xs", md: "xs" });
  const badgeSize = useBreakpointValue({ base: "xs", md: "sm" });

  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    if (!notification.read) {
      await markAsRead(notification._id || notification.id);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteNotification(notification._id || notification.id);
  };

  const formatTime = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Recently";
    }
  };

  return (
    <Box
      p={padding}
      borderBottom="1px"
      borderColor={colorMode === "dark" ? "gray.600" : "gray.200"}
      bg={
        notification.read
          ? "transparent"
          : colorMode === "dark"
            ? "blue.900"
            : "blue.50"
      }
      _hover={{
        bg: colorMode === "dark" ? "gray.700" : "gray.50",
      }}
      cursor="pointer"
      position="relative"
    >
      <Flex justify="space-between" align="flex-start" gap={2}>
        <Box flex="1" minW={0}>
          <Flex
            align="center"
            mb={1}
            gap={2}
            direction={isMobile ? "column" : "row"}
            alignItems={isMobile ? "flex-start" : "center"}
          >
            <Text
              fontWeight="semibold"
              fontSize={titleFontSize}
              noOfLines={isMobile ? 2 : 1}
              flex="1"
            >
              {notification.title}
            </Text>
            {!notification.read && (
              <Badge colorScheme="blue" size={badgeSize} flexShrink={0}>
                New
              </Badge>
            )}
          </Flex>
          <Text
            fontSize={messageFontSize}
            color="gray.600"
            mb={2}
            noOfLines={isMobile ? 3 : 2}
          >
            {notification.message}
          </Text>
          {notification.location && (
            <Text fontSize={metaFontSize} color="gray.500" mb={1} noOfLines={1}>
              📍 {notification.location.stateName}
            </Text>
          )}
          <Text fontSize={metaFontSize} color="gray.500">
            {formatTime(notification.createdAt)}
          </Text>
        </Box>

        <VStack spacing={1} flexShrink={0}>
          {!notification.read && (
            <Tooltip label="Mark as read" placement={isMobile ? "left" : "top"}>
              <IconButton
                aria-label="Mark as read"
                icon={<CheckIcon />}
                size={iconButtonSize}
                variant="ghost"
                colorScheme="green"
                onClick={handleMarkAsRead}
              />
            </Tooltip>
          )}
          <Tooltip label="Delete" placement={isMobile ? "left" : "top"}>
            <IconButton
              aria-label="Delete notification"
              icon={<DeleteIcon />}
              size={iconButtonSize}
              variant="ghost"
              colorScheme="red"
              onClick={handleDelete}
            />
          </Tooltip>
        </VStack>
      </Flex>
    </Box>
  );
};

export default NotificationItem;
