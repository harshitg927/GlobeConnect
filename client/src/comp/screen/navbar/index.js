import React, { Fragment, useState, useEffect, useRef, createRef } from "react";

import {
  useDisclosure,
  useColorMode,
  Heading,
  Flex,
  IconButton,
  Icon,
  Tooltip,
  Button,
  useMediaQuery,
  Box,
  Stack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
} from "@chakra-ui/react";

import {
  HamburgerIcon,
  MoonIcon,
  SunIcon,
  SettingsIcon,
  AddIcon,
  RepeatIcon,
} from "@chakra-ui/icons";

import { FaGlobeAfrica } from "react-icons/fa";

import { BsFillInfoCircleFill } from "react-icons/bs";

import { connect } from "react-redux";

import SettingsView from "../settings";
import LoginModal from "../../../components/auth/LoginModal";
import RegisterModal from "../../../components/auth/RegisterModal";
import CreatePostModal from "../../screen/post/CreatePostModal";
import NotificationIcon from "../../../components/notifications/NotificationIcon";

import { useAuth } from "../../../context/AuthContext";
import { logout } from "../../../services/authService";

import { useNavigate } from "react-router-dom";

import Actions from "../../redux/action";
import Constants from "../../utils/Constants";
import AppManager from "../../utils/AppManager";

const { MasterDrawerMenuType, MasterDrawerMenuConfig } = Constants;

const NavBarView = (props) => {
  const { userConfig, setUserConfig } = props;

  const [state, setState] = useState({
    selectedMenuType:
      userConfig?.selectedMenuType ?? MasterDrawerMenuType.Search,
  });

  const updateState = (data) =>
    setState((preState) => ({ ...preState, ...data }));

  const { isOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  const btnRef = useRef();
  const settingsRef = createRef();

  const { user, logout: authLogout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Check if the screen is mobile size
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  const navigate = useNavigate();

  const handleTitleClick = () => {
    navigate("/");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleFavoritesClick = () => {
    navigate("/favorites");
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /*  Life-cycles Methods */

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    updateState({
      selectedMenuType:
        userConfig?.selectedMenuType ?? MasterDrawerMenuType.Search,
    });
  }, [userConfig]);

  /*  Public Interface Methods */

  /*  UI Events Methods   */

  const onPressSettings = () => {
    settingsRef.current && settingsRef.current.openModal();
  };

  const onPressAddPost = () => {
    setIsCreatePostOpen(true);
  };

  const toggleViewMode = () => {
    const newViewMode = userConfig.viewMode === "globe" ? "map" : "globe";
    setUserConfig({
      ...userConfig,
      viewMode: newViewMode,
    });
  };

  /*  Server Request Methods  */

  /*  Server Response Methods  */

  /*  Server Response Handler Methods  */

  /*  Custom-Component sub-render Methods */

  const renderMasterContainer = () => {
    return (
      <>
        <Flex
          flexDirection={"row"}
          justifyContent={"space-between"}
          alignItems={"center"}
          boxShadow="md"
          p={isMobile ? "8px" : "10px"}
          zIndex={100}
          bg={colorMode === "dark" ? "black" : "white"}
          width="100%"
        >
          <Flex
            flexDirection={"row"}
            justifyContent="flex-start"
            alignItems="center"
            paddingY={1}
            cursor="pointer"
            onClick={handleTitleClick}
          >
            <Icon
              alignSelf={"center"}
              as={FaGlobeAfrica}
              boxSize={isMobile ? "20px" : "25px"}
            />
            <Flex
              flexDirection={"row"}
              alignItems="center"
              justifyContent="center"
            >
              <Heading ms={"10px"} size={isMobile ? "sm" : "md"}>
                {MasterDrawerMenuConfig[state?.selectedMenuType]?.mainTitle}
              </Heading>
            </Flex>
          </Flex>
          {isMobile ? (
            // Mobile menu with dropdown
            <Flex align="center" gap={2}>
              {user && <NotificationIcon />}
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Options"
                  icon={<HamburgerIcon />}
                  variant="outline"
                  size="sm"
                />
                <MenuList zIndex={1000}>
                  {user ? (
                    <>
                      <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
                      <MenuItem onClick={handleFavoritesClick}>
                        Favorites
                      </MenuItem>
                      <MenuItem onClick={onPressAddPost}>Add Post</MenuItem>
                      <MenuItem onClick={handleLogout}>Logout</MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem onClick={() => setIsLoginOpen(true)}>
                        Login
                      </MenuItem>
                      <MenuItem onClick={() => setIsRegisterOpen(true)}>
                        Register
                      </MenuItem>
                    </>
                  )}
                  <MenuItem onClick={toggleViewMode}>
                    Switch to{" "}
                    {userConfig.viewMode === "globe" ? "Map" : "Globe"} View
                  </MenuItem>
                  <MenuItem onClick={toggleColorMode}>
                    {colorMode === "light" ? "Dark Mode" : "Light Mode"}
                  </MenuItem>
                  <MenuItem onClick={onPressSettings}>Settings</MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          ) : (
            // Desktop layout
            <Flex>
              {user ? (
                <Stack direction="row" spacing={2} mr={4} alignItems="center">
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="teal"
                    variant="solid"
                    onClick={onPressAddPost}
                  >
                    Add Post
                  </Button>
                  <NotificationIcon />
                  <Button variant="ghost" onClick={handleFavoritesClick} mr={2}>
                    Favorites
                  </Button>
                  <Tooltip label="Profile">
                    <IconButton
                      aria-label="Profile"
                      icon={
                        <Avatar
                          size="sm"
                          name={user?.username || user?.name || user?.email}
                        />
                      }
                      variant="ghost"
                      onClick={handleProfileClick}
                    />
                  </Tooltip>
                  <Button variant="ghost" onClick={handleLogout}>
                    Logout
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={4} mr={4}>
                  <Button onClick={() => setIsLoginOpen(true)}>Login</Button>
                  <Button
                    colorScheme="teal"
                    variant="solid"
                    onClick={() => setIsRegisterOpen(true)}
                  >
                    Register
                  </Button>
                </Stack>
              )}
              <Tooltip
                label={`Switch to ${
                  userConfig.viewMode === "globe" ? "Map" : "Globe"
                } View`}
              >
                <IconButton
                  aria-label="Toggle View Mode"
                  icon={<RepeatIcon />}
                  onClick={toggleViewMode}
                  me={3}
                />
              </Tooltip>
              <Tooltip label="Toggle Dark/Light Mode">
                <IconButton
                  aria-label="Toggle Dark/Light Mode"
                  icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                  onClick={toggleColorMode}
                  me={3}
                />
              </Tooltip>
              <Tooltip label="Settings">
                <IconButton
                  aria-label="Settings"
                  icon={<SettingsIcon />}
                  onClick={onPressSettings}
                />
              </Tooltip>
            </Flex>
          )}
        </Flex>
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
        <RegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
        />
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
        />
        <SettingsView ref={settingsRef} />
      </>
    );
  };

  return renderMasterContainer();
};

const mapStateToProps = (state) => {
  return {
    userConfig: state.userConfig,
    userPref: state.userPref,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setUserConfig: (userConfig) => dispatch(Actions.setUserConfig(userConfig)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NavBarView);
