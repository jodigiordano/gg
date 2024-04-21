import assert from "node:assert";
import { System } from "../specification";
import { load } from "../index";

describe("links", () => {
  describe("a && b", () => {
    it("A <> B && B <> A", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }, { id: "bar" }],
        links: [
          {
            a: "foo",
            b: "bar",
          },
          {
            a: "bar",
            b: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate",
          path: "/links/0",
        },
        {
          message: "duplicate",
          path: "/links/1",
        },
      ]);
    });

    it("A <> B && B <> A - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [{ id: "bar" }, { id: "spam" }],
          },
        ],
        links: [
          {
            a: "foo.bar",
            b: "foo.spam",
          },
          {
            a: "foo.spam",
            b: "foo.bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate",
          path: "/links/0",
        },
        {
          message: "duplicate",
          path: "/links/1",
        },
      ]);
    });

    it("A.Y <> B && B <> A.Y", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [{ id: "bar" }],
          },
          {
            id: "bar",
          },
        ],
        links: [
          {
            a: "foo.bar",
            b: "bar",
          },
          {
            a: "bar",
            b: "foo.bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate",
          path: "/links/0",
        },
        {
          message: "duplicate",
          path: "/links/1",
        },
      ]);
    });

    it("A.Y <> B.Y && B.Y <> A.Y", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [{ id: "bar" }],
          },
          {
            id: "bar",
            systems: [{ id: "spam" }],
          },
        ],
        links: [
          {
            a: "foo.bar",
            b: "bar.spam",
          },
          {
            a: "bar.spam",
            b: "foo.bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "duplicate",
          path: "/links/0",
        },
        {
          message: "duplicate",
          path: "/links/1",
        },
      ]);
    });

    it("missing A", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }],
        links: [
          {
            a: "bar",
            b: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/links/0/a",
        },
      ]);
    });

    it("missing B", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }],
        links: [
          {
            a: "foo",
            b: "bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/links/0/b",
        },
      ]);
    });

    it("missing A.Y", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }, { id: "bar" }],
        links: [
          {
            a: "foo.bar",
            b: "bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/links/0/a",
        },
      ]);
    });

    it("missing B.Y", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }, { id: "bar" }],
        links: [
          {
            a: "bar",
            b: "foo.bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "missing",
          path: "/links/0/b",
        },
      ]);
    });

    it("inaccurate A", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo", systems: [{ id: "bar" }] }, { id: "bar" }],
        links: [
          {
            a: "foo",
            b: "bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "inaccurate",
          path: "/links/0/a",
        },
      ]);
    });

    it("inaccurate B", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }, { id: "bar", systems: [{ id: "spam" }] }],
        links: [
          {
            a: "foo",
            b: "bar",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "inaccurate",
          path: "/links/0/b",
        },
      ]);
    });

    it("A <> A", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [{ id: "foo" }],
        links: [
          {
            a: "foo",
            b: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "self-reference",
          path: "/links/0",
        },
      ]);
    });

    it("A <> A - subsystem", () => {
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
            ],
          },
        ],
        links: [
          {
            a: "foo.bar",
            b: "foo",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, [
        {
          message: "self-reference",
          path: "/links/0",
        },
        {
          message: "inaccurate",
          path: "/links/0/b",
        },
      ]);
    });

    it("A.X <> A.Y", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [{ id: "bar" }, { id: "spam" }],
          },
        ],
        links: [
          {
            a: "foo.bar",
            b: "foo.spam",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, []);
    });

    it("A.X <> A.Y - subsystem", () => {
      const system: System = {
        specificationVersion: "1.0.0",
        title: "test",
        systems: [
          {
            id: "foo",
            systems: [
              {
                id: "bar",
                systems: [{ id: "spam" }, { id: "baz" }],
              },
            ],
          },
        ],
        links: [
          {
            a: "foo.bar.spam",
            b: "foo.bar.baz",
          },
        ],
      };

      const { errors } = load(system);

      assert.deepEqual(errors, []);
    });
  });
});
