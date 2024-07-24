import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadYaml } from "../src/index";

export function loadExample(name: string) {
  const examplesDirectory = [
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "examples",
  ].join("/");

  return loadYaml(
    readFileSync([examplesDirectory, `${name}.yml`].join("/"), "utf8"),
  );
}
