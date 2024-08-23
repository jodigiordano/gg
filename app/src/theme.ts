export function getThemeOnLoad(): "light" | "dark" {
  // Default theme.
  let theme: "light" | "dark" = "light";

  // The chosen theme is stored in local storage.
  const themeFromLocalStorage = localStorage.getItem("theme");

  if (themeFromLocalStorage) {
    if (themeFromLocalStorage === "dark") {
      theme = "dark";
    }
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    // Theme set by the OS.
    theme = "dark";
  }

  return theme;
}
