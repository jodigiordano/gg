import checker from "vite-plugin-checker";
import fs from 'node:fs';

function base64Loader() {
  return {
    name: "base64-loader",
    transform(_, id) {
      const [path, query] = id.split("?");

      if (query != "base64") return null;

      const data = fs.readFileSync(path);
      const base64 = data.toString("base64");

      return `export default '${base64}';`;
    },
  };
}

export default {
  cacheDir: "tmp",
  assetsInclude: ["./examples/*.yml"],
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    checker({
      typescript: true,
    }),
    base64Loader(),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
    assetsInlineLimit: 1024 * 1024 // 1MB.
  },
};
