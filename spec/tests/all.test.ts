import assert from "node:assert";
import { describe, it } from "node:test";
import { loadExample } from "./helpers";

describe("examples", () => {
  it("valid", () => {
    const example = loadExample("dataflows");

    console.dir(example, { depth: null });

    assert.equal(example.system.name, "dataflows");
    assert.deepEqual(example.errors, []);
  });
});
