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
