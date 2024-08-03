import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadJSON } from "../src/index";

export function loadExample(name: string) {
  const examplesDirectory = [
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "examples",
  ].join("/");

  return loadJSON(
    readFileSync([examplesDirectory, `${name}.json`].join("/"), "utf8"),
  );
}
