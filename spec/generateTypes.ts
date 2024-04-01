import { compileFromFile } from "json-schema-to-typescript";
import { FileInfo } from "@bcherny/json-schema-ref-parser";
import fs from "fs";

async function execute() {
  const directory = [import.meta.dirname, "schemas"].join("/");

  const compiled = await compileFromFile(`${directory}/system.json`, {
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
            const filename = file.url
              .split("https://dataflows.io/")
              .at(1)

            return fs.readFileSync(`${directory}/${filename}`, "utf8");
          },
        },
      },
    },
  });

  console.log(compiled);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
execute();
