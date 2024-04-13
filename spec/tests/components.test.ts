import assert from "node:assert";
import { describe, it } from "node:test";
import { System } from "../specification";
import { load } from "../index";

describe("components", () => {
  describe("name", () => {
    it("invalid", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "!",
          },
        ],
      };

      const { errors } = load(system);

      assert.equal(errors.at(0)?.path, "/components/0/name");
      assert(errors.at(0)?.message.startsWith("must match pattern"));
    });

    it("duplicate", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
          },
          {
            name: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate name",
          path: "/system/components/0/foo",
        },
        {
          message: "duplicate name",
          path: "/system/components/1/foo",
        },
      ]);
    });
  });
});
