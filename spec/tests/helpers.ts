import { readFileSync } from "node:fs";
import { loadYaml } from "../index";

export function loadExample(name: string) {
  return loadYaml(
    readFileSync(
      [import.meta.dirname, `../examples/${name}.yml`].join("/"),
      "utf8",
    ),
  );
}
