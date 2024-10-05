import { PathPattern } from "@gg/core";

//
// Path pattern
//

let linePattern: PathPattern = "solid-line";

const linePatternPipe = document.getElementById(
  "operation-set-line-pattern-pipe",
)!;

const linePatternSolid = document.getElementById(
  "operation-set-line-pattern-solid",
)!;

const linePatternDotted = document.getElementById(
  "operation-set-line-pattern-dotted",
)!;

function setLinePatternPipe(): void {
  linePattern = "pipe";

  linePatternDotted.classList.add("hidden");
  linePatternPipe.classList.remove("hidden");
}

function setLinePatternSolid(): void {
  linePattern = "solid-line";

  linePatternPipe.classList.add("hidden");
  linePatternSolid.classList.remove("hidden");
}

function setLinePatternDotted(): void {
  linePattern = "dotted-line";

  linePatternSolid.classList.add("hidden");
  linePatternDotted.classList.remove("hidden");
}

export function cycleLinePattern(): void {
  if (!linePatternPipe.classList.contains("hidden")) {
    setLinePatternSolid();
  } else if (!linePatternSolid.classList.contains("hidden")) {
    setLinePatternDotted();
  } else {
    setLinePatternPipe();
  }
}

export function resetLinePattern(): void {
  setLinePatternSolid();
}

export function hideLinePattern(): void {
  linePatternDotted.classList.add("hidden");
  linePatternPipe.classList.add("hidden");
  linePatternSolid.classList.add("hidden");
}

export function getLinePattern(): PathPattern {
  return linePattern;
}

linePatternPipe.addEventListener("click", setLinePatternSolid);
linePatternSolid.addEventListener("click", setLinePatternDotted);
linePatternDotted.addEventListener("click", setLinePatternPipe);
