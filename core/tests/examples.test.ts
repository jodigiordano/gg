import assert from "node:assert";
import { loadExample } from "./helpers";

describe("examples", () => {
  for (const name of ["minimal", "basic", "subsystems", "complex"]) {
    it(name, () => {
      const example = loadExample(name);

      assert.deepEqual(example.errors, []);
    });
  }
});
