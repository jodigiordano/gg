import { compileFromFile } from "json-schema-to-typescript";
import { FileInfo } from "@bcherny/json-schema-ref-parser";
import fs from "fs";

const schemasDirectory = [import.meta.dirname, "schemas"].join("/");

async function generateTypes() {
  const compiled = await compileFromFile(`${schemasDirectory}/system.json`, {
    declareExternallyReferenced: true,
    enableConstEnums: false,
    bannerComment: "",
    style: {
      bracketSpacing: true,
      printWidth: 120,
      semi: true,
      singleQuote: true,
      useTabs: false,
      tabWidth: 2,
      trailingComma: "all",
    },
    unknownAny: true,
    $refOptions: {
      resolve: {
        local: {
          order: 1,
          canRead: true,
          read: async function (
            file: FileInfo,
            _callback?: (error: Error | null, data: string | null) => unknown,
          ): Promise<string> {
            const filename = file.url.split("https://dataflows.io/").at(1);

            return fs.readFileSync(`${schemasDirectory}/${filename}`, "utf8");
          },
        },
      },
    },
  });

  console.log(compiled);
}

async function generateSchemas() {
  const filenames = fs
    .readdirSync(schemasDirectory)
    .filter((filename) => filename.endsWith(".json"));

  console.log("const schemas = [");

  for (const filename of filenames) {
    const content = fs.readFileSync([schemasDirectory, filename].join("/"));

    console.log(`${content},`);
  }

  console.log("];");

  console.log("");
  console.log('import ajv from "ajv";');
  console.log("");
  console.log(
    "export const specification = new ajv({ schemas, allErrors: true });",
  );
}

async function execute() {
  await generateTypes();
  await generateSchemas();
}

execute();
