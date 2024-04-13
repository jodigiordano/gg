import assert from "node:assert";
import { describe, it } from "node:test";
import { System } from "../specification";
import { load } from "../index";

describe("flows", () => {
  describe("keyframe", () => {
    it("normalizes", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }, { id: "bar" }],
        links: [
          {
            a: "foo",
            b: "bar",
          },
        ],
        flows: [
          {
            steps: [
              { from: "foo", to: "bar", keyframe: 0 },
              { from: "foo", to: "bar", keyframe: 2 },
              { from: "foo", to: "bar", keyframe: 4 },
            ],
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(
        runtime.flows.at(0)?.steps.map(step => step.keyframe),
        [0, 1, 2],
      );
    });
  });
});
