import assert from "node:assert";
import { System } from "../specification";
import { load } from "../index";

describe("systems", () => {
  describe("id", () => {
    it("forbidden characters", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "!",
          },
        ],
      };

      const { errors } = load(system);

      assert.equal(errors.at(0)?.path, "/systems/0/id");
      assert(errors.at(0)?.message.startsWith("must match pattern"));
    });

    it("duplicate", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
          },
          {
            id: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate id",
          path: "/systems/0",
        },
        {
          message: "duplicate id",
          path: "/systems/1",
        },
      ]);
    });

    it("duplicate - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [
              {
                id: "bar",
              },
              {
                id: "bar",
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate id",
          path: "/systems/0/systems/0",
        },
        {
          message: "duplicate id",
          path: "/systems/0/systems/1",
        },
      ]);
    });
  });

  describe("position", () => {
    it("out of bounds", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
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
          path: "/systems/0",
        },
      ]);
    });

    it("out of bounds - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [
              {
                id: "bar",
                position: {
                  x: 64,
                  y: 0,
                },
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "out of bounds",
          path: "/systems/0/systems/0",
        },
      ]);
    });

    it("overlaps", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: {
              x: 10,
              y: 0,
            },
          },
          {
            id: "bar",
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
          message: "overlaps with /systems/1",
          path: "/systems/0",
        },
        {
          message: "overlaps with /systems/0",
          path: "/systems/1",
        },
      ]);
    });

    it("out of bounds - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [
              {
                id: "bar",
                position: {
                  x: 10,
                  y: 0,
                },
              },
              {
                id: "spam",
                position: {
                  x: 12,
                  y: 0,
                },
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "overlaps with /systems/0/systems/1",
          path: "/systems/0/systems/0",
        },
        {
          message: "overlaps with /systems/0/systems/0",
          path: "/systems/0/systems/1",
        },
      ]);
    });
  });
});
