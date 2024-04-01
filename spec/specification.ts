import { readdirSync, readFileSync } from "node:fs";
import ajv from "ajv";

const directory = [import.meta.dirname, "schemas"].join("/");

const schemas = readdirSync(directory)
  .filter((filename) => filename.endsWith(".json"))
  .map((filename) =>
    JSON.parse(readFileSync([directory, filename].join("/"), "utf8")),
  );

const specification = new ajv({ schemas, allErrors: true });

export default specification;
