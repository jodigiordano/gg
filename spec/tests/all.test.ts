import assert from "node:assert";
import { describe, it } from "node:test";
import { loadExample } from "./helpers";

describe("examples", () => {
  it("valid", () => {
    assert.doesNotThrow(() => loadExample("dataflows"));
  });
});
