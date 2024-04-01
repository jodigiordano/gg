import assert from "node:assert";
import { describe, it } from "node:test";
import { loadExample } from "./helpers";

describe("examples", () => {
  it("valid", () => {
    const example = loadExample("dataflows");

    assert.equal(example.name, "dataflows");
  });
});
