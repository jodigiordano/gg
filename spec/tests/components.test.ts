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
          path: "/system/components/0",
        },
        {
          message: "duplicate name",
          path: "/system/components/1",
        },
      ]);
    });

    it("duplicate - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
            system: {
              components: [
                {
                  name: "bar",
                },
                {
                  name: "bar",
                },
              ],
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate name",
          path: "/system/components/0/system/components/0",
        },
        {
          message: "duplicate name",
          path: "/system/components/0/system/components/1",
        },
      ]);
    });
  });

  describe("position", () => {
    it("out of bounds", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
            position: {
              x: 64,
              y: 0,
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "out of bounds",
          path: "/system/components/0",
        },
      ]);
    });

    it("out of bounds - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
            system: {
              components: [
                {
                  name: "bar",
                  position: {
                    x: 64,
                    y: 0,
                  },
                },
              ],
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "out of bounds",
          path: "/system/components/0/system/components/0",
        },
      ]);
    });

    it("overlaps", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
            position: {
              x: 10,
              y: 0,
            },
          },
          {
            name: "bar",
            position: {
              x: 12,
              y: 0,
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "overlaps with component /system/components/1",
          path: "/system/components/0",
        },
        {
          message: "overlaps with component /system/components/0",
          path: "/system/components/1",
        },
      ]);
    });

    it("out of bounds - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        name: "test",
        components: [
          {
            name: "foo",
            system: {
              components: [
                {
                  name: "bar",
                  position: {
                    x: 10,
                    y: 0,
                  },
                },
                {
                  name: "spam",
                  position: {
                    x: 12,
                    y: 0,
                  },
                },
              ],
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message:
            "overlaps with component /system/components/0/system/components/1",
          path: "/system/components/0/system/components/0",
        },
        {
          message:
            "overlaps with component /system/components/0/system/components/0",
          path: "/system/components/0/system/components/1",
        },
      ]);
    });
  });
});
