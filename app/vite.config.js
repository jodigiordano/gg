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

export default {
  root: "src",
  cacheDir: "tmp",
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    checker({
      typescript: true,
    }),
    base64Loader(),
    inlineSvgLoader(),
    partialHtmlLoader(),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: browserslistToEsbuild(),
    sourcemap: true,
    assetsInlineLimit: 1024 * 1024, // 1MB.
    rollupOptions: {
      input: {
        editor: "./src/index.html",
        viewer: "./src/viewer.html",
        terms: "./src/terms.html",
        privacy: "./src/privacy.html",
      },
    },
  },
};
