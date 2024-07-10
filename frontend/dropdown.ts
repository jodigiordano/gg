export function initializeDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");

  for (const dropdown of dropdowns) {
    dropdown.querySelector("button")!.addEventListener("click", function () {
      const content = dropdown.querySelector(".content")!;

      if (content.classList.contains("closed")) {
        content.classList.remove("closed");
      } else {
        content.classList.add("closed");
      }
    });
  }

  window.addEventListener("click", function (event) {
    for (const dropdown of dropdowns) {
      const button = dropdown.querySelector("button")!;

      if (event.target && !button.isSameNode(event.target as Node)) {
        const content = dropdown.querySelector(".content")!;

        content.classList.add("closed");
      }
    }
  });
}
