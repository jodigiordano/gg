import { loadJSON, SystemSimulator } from "@gg/core";

onmessage = function (event) {
  if (event.data.operation === "initialize") {
    let result: ReturnType<typeof loadJSON>;

    try {
      result = loadJSON(event.data.json);
    } catch (error) {
      postMessage({
        operationId: event.data.operationId,
        operation: event.data.operation,
        success: false,
        errors: [(error as Error).message],
      });

      return;
    }

    if (result.errors.length) {
      const errors = result.errors.map(error =>
        [error.path, error.message].join(" "),
      );

      const warnings = result.warnings.map(warning =>
        [warning.path, warning.message].join(" "),
      );

      postMessage({
        operationId: event.data.operationId,
        operation: event.data.operation,
        success: false,
        errors,
        warnings,
      });

      return;
    }

    const simulator = new SystemSimulator({ system: result.system });

    simulator.compute();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
      success: true,
      simulator,
    });
  }
};

postMessage({ operation: "ready" });
