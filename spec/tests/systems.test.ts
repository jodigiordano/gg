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
            position: { x: 0, y: 0 },
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
            position: { x: 0, y: 0 },
          },
          {
            id: "foo",
            position: { x: 10, y: 0 },
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
            position: { x: 0, y: 0 },
            systems: [
              {
                id: "bar",
                position: { x: 0, y: 0 },
              },
              {
                id: "bar",
                position: { x: 10, y: 0 },
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
    it("basic", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
            title: "bar spam",
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.titleSize, {
        width: 4,
        height: 1,
      });
    });

    it("multiline", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
            title: "bar\\nspam",
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.titleSize, {
        width: 2,
        height: 2,
      });
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
            position: { x: 0, y: 0 },
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.titlePosition, { x: 1, y: 1 });
    });
  });

  describe("position", () => {
    it("overlaps", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            // has size of 3x3
            id: "foo",
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 2,
              y: 0,
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "foo overlaps with bar",
          path: "/systems/0",
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
              x: 0,
              y: 0,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 4,
              y: 0,
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "foo overlaps with bar",
          path: "/systems/0",
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
              x: 0,
              y: 0,
            },
          },
          {
            // has size of 3x3
            id: "bar",
            position: {
              x: 10,
              y: 0,
            },
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "foo overlaps with bar",
          path: "/systems/0",
        },
      ]);
    });

    it("overlaps - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
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
          message: "foo.bar overlaps with foo.spam",
          path: "/systems/0/systems/0",
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
            position: { x: 0, y: 0 },
            systems: [
              {
                id: "bar",
                position: {
                  x: -1,
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
          message: "foo.bar is out of bounds of foo",
          path: "/systems/0/systems/0",
        },
      ]);
    });
  });

  describe("size", () => {
    it("basic", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.size, {
        width: 4,
        height: 3,
      });
    });

    it("links", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          { id: "a", position: { x: 0, y: 0 } },
          { id: "1", position: { x: 10, y: 0 } },
          { id: "2", position: { x: 20, y: 0 } },
          { id: "3", position: { x: 30, y: 0 } },
          { id: "4", position: { x: 40, y: 0 } },
          { id: "5", position: { x: 50, y: 0 } },
          { id: "6", position: { x: 60, y: 0 } },
          { id: "7", position: { x: 70, y: 0 } },
          { id: "8", position: { x: 80, y: 0 } },
          { id: "9", position: { x: 90, y: 0 } },
        ],
        links: [],
      };

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 3,
        height: 3,
      });

      system.links!.push({ a: "a", b: "1" });
      system.links!.push({ a: "a", b: "2" });
      system.links!.push({ a: "a", b: "3" });
      system.links!.push({ a: "a", b: "4" });

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 3,
        height: 3,
      });

      system.links!.push({ a: "a", b: "5" });

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 5,
        height: 3,
      });

      system.links!.push({ a: "a", b: "6" });

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 5,
        height: 3,
      });

      system.links!.push({ a: "a", b: "7" });

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 7,
        height: 3,
      });

      system.links!.push({ a: "a", b: "8" });

      assert.deepEqual(load(system).system.systems.at(0)?.size, {
        width: 7,
        height: 3,
      });
    });

    it("title", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
            title: "foo bar spam",
          },
        ],
      };

      const { system: runtime } = load(system);

      assert.deepEqual(runtime.systems.at(0)?.size, {
        width: 8,
        height: 3,
      });
    });
  });
});
