import assert from "node:assert";
import { SystemSimulator } from "../src/index.js";
import { loadExample, render } from "./helpers.js";

describe("examples", () => {
  it("valid", async () => {
    const example = loadExample("complex");

    assert.deepEqual(example.errors, []);

    const simulator = new SystemSimulator(example.system);

    await render(simulator);
  });
});
