import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { Provider } from "react-redux";
import store from "./comp/redux/store";
import MasterContainer from "./comp/screen/mastercontainer";
import theme from "./theme";
import "./App.css";

function App() {
  return (
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <MasterContainer />
      </ChakraProvider>
    </Provider>
  );
}

export default App;
