import assert from "node:assert";
import { describe, it } from "node:test";
import { loadExample } from "./helpers";

describe("examples", () => {
  for (const name of ["minimal", "basic", "subsystems", "dataflows"]) {
    it(name, () => {
      const example = loadExample(name);

      assert.deepEqual(example.errors, []);
    });
  }
});
