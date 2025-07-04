import { extendTheme } from "@chakra-ui/react";

const CustomTheme = extendTheme((currentTheme) => {
  return {
    components: {
      AccordionButton: {
        variants: {
          customV1: {
            bg:
              currentTheme.config.initialColorMode === "dark"
                ? "gray.700"
                : "gray.100",
          },
        },
      },
    },
  };
});

export default {
  CustomTheme,
};
