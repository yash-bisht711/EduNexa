import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tailwindConfig = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "tailwind.config.js",
);

export default {
  plugins: {
    tailwindcss: { config: tailwindConfig },
    autoprefixer: {},
  },
};
