import assert from "node:assert";
import { System } from "../src/specification";
import { load } from "../src/index";

describe("flows", () => {
  describe("from && to", () => {
    it("missing from", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "bar", position: { x: 0, y: 0 } }],
        links: [],
        flows: [
          {
            steps: [
              {
                from: "foo",
                to: "bar",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/flows/0/steps/0/from",
        },
      ]);
    });

    it("missing to", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          { id: "foo", position: { x: 0, y: 0 } },
          { id: "bar", position: { x: 10, y: 0 } },
        ],
        links: [{ a: "foo", b: "bar" }],
        flows: [
          {
            steps: [
              {
                from: "foo",
                to: "spam",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/flows/0/steps/0/to",
        },
      ]);
    });

    it("inaccurate from", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            position: { x: 0, y: 0 },
            systems: [{ id: "bar", position: { x: 0, y: 0 } }],
          },
          { id: "spam", position: { x: 20, y: 0 } },
        ],
        links: [{ a: "bar", b: "spam" }],
        flows: [
          {
            steps: [
              {
                from: "foo",
                to: "bar",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "inaccurate",
          path: "/flows/0/steps/0/from",
        },
      ]);
    });

    it("inaccurate to", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          { id: "foo", position: { x: 0, y: 0 } },
          {
            id: "bar",
            position: { x: 10, y: 0 },
            systems: [{ id: "spam", position: { x: 0, y: 0 } }],
          },
        ],
        links: [{ a: "foo", b: "spam" }],
        flows: [
          {
            steps: [
              {
                from: "foo",
                to: "bar",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "inaccurate",
          path: "/flows/0/steps/0/to",
        },
      ]);
    });

    it("missing link (A)", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          { id: "foo", position: { x: 0, y: 0 } },
          { id: "bar", position: { x: 10, y: 0 } },
        ],
        links: [],
        flows: [
          {
            steps: [
              {
                from: "foo",
                to: "bar",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "no path",
          path: "/flows/0/steps/0",
        },
      ]);
    });

    it("missing link (A.B.C.D)", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "a",
            position: { x: 0, y: 0 },
            systems: [
              {
                id: "a1",
                position: { x: 0, y: 0 },
                systems: [
                  {
                    id: "a2",
                    position: { x: 0, y: 0 },
                  },
                ],
              },
            ],
          },
          {
            id: "b",
            position: { x: 20, y: 0 },
            systems: [
              {
                id: "b1",
                position: { x: 0, y: 0 },
              },
              {
                id: "b2",
                position: { x: 10, y: 0 },
              },
            ],
          },
        ],
        links: [
          {
            a: "a2",
            b: "b1",
          },
        ],
        flows: [
          {
            steps: [
              {
                from: "a2",
                to: "b2",
                keyframe: 0,
              },
            ],
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "no path",
          path: "/flows/0/steps/0",
        },
      ]);
    });
  });
});
