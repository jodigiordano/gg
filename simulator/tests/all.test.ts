import assert from "node:assert";
import { SystemSimulator } from "../index";
import { loadExample, render } from "./helpers";

describe("examples", () => {
  it("valid", async () => {
    const example = loadExample("dataflows");

    assert.deepEqual(example.errors, []);

    const simulator = new SystemSimulator(example.system);

    await render(simulator);
  });
});
