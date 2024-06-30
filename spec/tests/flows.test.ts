import assert from "node:assert";
import { System } from "../specification";
import { load } from "../index";

describe("flows", () => {
  describe("keyframe", () => {
    it("normalizes", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          { id: "foo", position: { x: 0, y: 0 } },
          { id: "bar", position: { x: 10, y: 0 } },
        ],
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
                to: "bar.spam",
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
          { id: "bar", position: { x: 10, y: 0 } },
        ],
        links: [{ a: "foo.bar", b: "bar" }],
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
        links: [{ a: "foo", b: "bar.spam" }],
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
            id: "foo",
            position: { x: 0, y: 0 },
            systems: [
              {
                id: "bar",
                position: { x: 0, y: 0 },
                systems: [
                  {
                    id: "spam",
                    position: { x: 0, y: 0 },
                  },
                ],
              },
            ],
          },
          {
            id: "bar",
            position: { x: 20, y: 0 },
            systems: [
              {
                id: "spam",
                position: { x: 0, y: 0 },
              },
              {
                id: "baz",
                position: { x: 10, y: 0 },
              },
            ],
          },
        ],
        links: [
          {
            a: "foo.bar.spam",
            b: "bar.spam",
          },
        ],
        flows: [
          {
            steps: [
              {
                from: "foo.bar.spam",
                to: "bar.baz",
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
