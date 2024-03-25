import assert from "node:assert";
import { describe, it } from "node:test";
import { validate, loadExample } from "./helpers";

describe("examples", () => {
  it("valid", () => {
    const example = loadExample("dataflows");

    validate(example);

    assert.deepEqual(validate.errors, null);
  });
});
