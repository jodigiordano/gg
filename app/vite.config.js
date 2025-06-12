import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import browserslistToEsbuild from "browserslist-to-esbuild";
import fs from "node:fs";

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

function inlineSvgLoader() {
  return {
    name: "inline-svg-loader",
    transformIndexHtml(html) {
      return html.replace(
        /<inline-svg>(.*)<\/inline-svg>/g,
        (_match, filename) => {
          return fs.readFileSync(`./src/assets/${filename}.svg`);
        },
      );
    },
  };
}

function partialHtmlLoader() {
  return {
    name: "partial-html-loader",
    transformIndexHtml(html) {
      return html.replace(/<partial>(.*)<\/partial>/g, (_match, filename) => {
        return fs.readFileSync(`./src/assets/${filename}.html`);
      });
    },
  };
}

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    root: "src",
    envDir: "../",
    cacheDir: "tmp",
    plugins: [
      checker({
        typescript: true,
      }),
      base64Loader(),
      inlineSvgLoader(),
      partialHtmlLoader(),
    ],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        process.env.npm_package_version,
      ),
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      target: browserslistToEsbuild(),
      sourcemap: true,
      assetsInlineLimit: 1024 * 25, // 25kb.
      rollupOptions: {
        input: {
          index: "./src/index.html",
          viewer: "./src/viewer.html",
          404: "./src/404.html",
          icons: "./src/icons.html",
        },
      },
    },
  });
};
