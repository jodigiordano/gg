import { readFileSync } from "node:fs";
import { load as parseYaml } from "js-yaml";
import { System, Subsystem } from "./types";
import { validate } from "./validations";

export default function load(filePath: string): System {
  const system = parseYaml(readFileSync(filePath, "utf8")) as System;

  computeSizes(system);
  validate(system);

  return system;
}

function computeSizes(system: System | Subsystem): void {
  for (const component of system.components) {
    // TODO.

    if (component.system) {
      computeSizes(component.system);
    }
  }
}
