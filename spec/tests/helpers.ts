import { readdirSync, readFileSync } from "node:fs";
import ajv, { ValidateFunction } from "ajv";
import { load as parseYaml } from "js-yaml";

const directory = [import.meta.dirname, "../schemas"].join("/");

const schemas = readdirSync(directory)
  .filter((filename) => filename.endsWith(".json"))
  .map((filename) =>
    JSON.parse(readFileSync([directory, filename].join("/"), "utf8")),
  );

const spec = new ajv({ schemas, allErrors: true });

export const validate = spec.getSchema(
  "https://dataflows.io/system.json",
) as ValidateFunction;

export function loadExample(name: string) {
  return parseYaml(
    readFileSync(
      [import.meta.dirname, `../examples/${name}.yml`].join("/"),
      "utf8",
    ),
  );
}
