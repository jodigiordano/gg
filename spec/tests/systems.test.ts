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
            position: { x: 1, y: 1 },
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
            position: { x: 1, y: 1 },
          },
          {
            id: "foo",
            position: { x: 10, y: 1 },
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
            position: { x: 1, y: 1 },
            systems: [
              {
                id: "bar",
                position: { x: 1, y: 1 },
              },
              {
                id: "bar",
                position: { x: 10, y: 1 },
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

  describe("titleSize", () => {
    it("calculated", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 1, y: 1 },
            title: "bar spam",
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.titleSize, {
        width: 4,
        height: 1,
      });

      assert.deepEqual(runtime.systems.at(0)?.size, { width: 6, height: 3 });
    });
  });

  describe("titlePosition", () => {
    it("calculated", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 1, y: 1 },
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.titlePosition, { x: 1, y: 1 });
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
              y: 1,
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

    it("overlaps", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            // has size of 3x3
            id: "foo",
            position: {
              x: 1,
              y: 1,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 2,
              y: 1,
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

    it("overlaps - margins", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            // has size of 3x3
            id: "foo",
            position: {
              x: 1,
              y: 1,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 4,
              y: 1,
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

    it("overlaps - title", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            // has size of ~20x3
            id: "foo",
            title: "has a very long title, which makes it size X grow",
            position: {
              x: 1,
              y: 1,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 10,
              y: 1,
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
            position: { x: 1, y: 1 },
            systems: [
              {
                id: "bar",
                position: {
                  x: 10,
                  y: 1,
                },
              },
              {
                id: "spam",
                position: {
                  x: 12,
                  y: 1,
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
