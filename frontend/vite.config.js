import checker from "vite-plugin-checker";

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
  ],
  build: {
    target: 'es2022',
    sourcemap: true
  }
};
