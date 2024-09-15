import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import sitemap from "vite-plugin-sitemap";
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
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      checker({
        typescript: true,
      }),
      base64Loader(),
      inlineSvgLoader(),
      partialHtmlLoader(),
      sitemap({
        hostname: process.env["VITE_PUBLIC_URL"],
        exclude: [
          "/viewer",
          "/profile",
          "/graphs",
          "/graph",
          "/export",
          "/404",
          "/icons",
        ],
        changefreq: "weekly",
        priority: {
          "/editor": 1.0,
          "/plus": 0.9,
          "/sign-in": 0.8,
          "/terms": 0.7,
          "/privacy": 0.7,
        },
        generateRobotsTxt: true,
      }),
    ],
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      target: browserslistToEsbuild(),
      sourcemap: true,
      assetsInlineLimit: 1024 * 25, // 25kb.
      rollupOptions: {
        input: {
          editor: "./src/index.html",
          viewer: "./src/viewer.html",
          signIn: "./src/sign-in.html",
          plus: "./src/plus.html",
          profile: "./src/profile.html",
          terms: "./src/terms.html",
          privacy: "./src/privacy.html",
          graphs: "./src/graphs.html",
          graph: "./src/graph.html",
          export: "./src/export.html",
          404: "./src/404.html",
          icons: "./src/icons.html",
        },
      },
    },
  });
};
