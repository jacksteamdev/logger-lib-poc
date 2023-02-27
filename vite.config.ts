import { defineConfig } from "vite";
import { loggerPlugin } from "./loggerPlugin";

export default defineConfig(() => {
  return {
    plugins: [loggerPlugin({ loggerConfigFile: "/src/logger.ts" })],
  };
});
