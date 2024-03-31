import { readdirSync, readFileSync } from "node:fs";
import ajv from "ajv";
import { load as parseYaml } from "js-yaml";
import { System } from "./types";

const directory = [import.meta.dirname, "schemas"].join("/");

const schemas = readdirSync(directory)
  .filter((filename) => filename.endsWith(".json"))
  .map((filename) =>
    JSON.parse(readFileSync([directory, filename].join("/"), "utf8")),
  );

const spec = new ajv({ schemas, allErrors: true });

export * from "./types";

export const validate = spec.getSchema<System>(
  "https://dataflows.io/system.json",
)!;

export class InvalidSystemError extends Error {
  details: unknown;

  constructor(details: unknown) {
    super();
    this.details = details;
  }
}

export function load(filePath: string): System {
  const system = parseYaml(readFileSync(filePath, "utf8")) as System;

  validate(system);

  if (validate.errors) {
    throw new InvalidSystemError(validate.errors);
  }

  return system;
}
