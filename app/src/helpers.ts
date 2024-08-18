// The size of a block in the canvas.
export const BlockSize = 32;

// Debounce a function to make sure it executes only once,
// X milliseconds after its last call.
//
// For example:
//
//   window.addEventListener(
//     "click",
//     debounce(() => { console.debug("clicked!") }, 500)
//   );
//
// Now if the user clicks multiple times on window at times 0, 100, 500, 1000
// and 1500, the callback will be called at times 1000 and 1500.
export function debounce(callback: () => void, waitMs: number) {
  let timeoutId: number | undefined = undefined;

  return () => {
    window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      callback();
    }, waitMs);
  };
}

const domParser = new DOMParser();

// Sanitize an HTML-like string.
export function sanitizeHtml(html: string): string {
  return domParser.parseFromString(html, "text/html").body.textContent ?? "";
}

// Get the white or black foreground color of a given background color.
export function getForegroundColor(backgroundColor: string) {
  const components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    backgroundColor,
  )!;

  const r = parseInt(components[1], 16);
  const g = parseInt(components[2], 16);
  const b = parseInt(components[3], 16);

  // Relative luminance.
  // https://en.wikipedia.org/wiki/Luma_(video)#Use_of_relative_luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance < 140 ? "#ffffff" : "#000000";
}
