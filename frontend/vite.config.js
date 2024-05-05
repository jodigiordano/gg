import checker from "vite-plugin-checker";

export default {
  cacheDir: "tmp",
  plugins: [
    checker({
      typescript: true,
    }),
  ],
};
