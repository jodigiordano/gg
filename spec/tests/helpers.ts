import { readFileSync } from "node:fs";
import { loadYaml } from "../src/index";

export function loadExample(name: string) {
  return loadYaml(
    readFileSync(
      [import.meta.dirname, `../examples/${name}.yml`].join("/"),
      "utf8",
    ),
  );
}
