import { defineConfig } from "vite";
import path from "node:path";

const getBasePath = () => {
  const fromEnv = process.env.VITE_BASE_PATH;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`;
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1] || "";
    if (repo) return `/${repo}/`;
  }

  return "/";
};

export default defineConfig({
  base: getBasePath(),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/@firebase") ||
            id.includes("node_modules/firebase")
          ) {
            return "firebase";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
});
