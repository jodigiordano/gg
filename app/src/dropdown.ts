export function initializeDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");

  for (const dropdown of dropdowns) {
    const button = dropdown.querySelector("button")!;

    button.addEventListener("click", function () {
      if (button.classList.contains("pressed")) {
        button.classList.remove("pressed");
      } else {
        button.classList.add("pressed");
      }

      const content = dropdown.querySelector(".content")!;

      if (content.classList.contains("closed")) {
        content.classList.remove("closed");
      } else {
        content.classList.add("closed");
      }

      // Remove focus once clicked.
      this.blur();
    });
  }

  window.addEventListener("click", function (event) {
    for (const dropdown of dropdowns) {
      const button = dropdown.querySelector("button")!;

      if (event.target && !button.isSameNode(event.target as Node)) {
        button.classList.remove("pressed");

        const content = dropdown.querySelector(".content")!;

        content.classList.add("closed");
      }
    }
  });
}
