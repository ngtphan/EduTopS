import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./landing.html",
    "./public/**/*.html",
    "./src/**/*.html",
    "./src/**/*.ts",
    "./assets/js/**/*.ts",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
