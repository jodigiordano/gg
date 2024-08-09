import { loadJSON, SystemSimulator } from "@gg/core";

onmessage = function (event) {
  let result: ReturnType<typeof loadJSON>;

  try {
    result = loadJSON(event.data.json);
  } catch (error) {
    postMessage({
      id: event.data.id,
      success: false,
      errors: [(error as Error).message],
    });
    return;
  }

  if (result.errors.length) {
    const messages = result.errors.map(error =>
      [error.path, error.message].join(" "),
    );

    postMessage({ id: event.data.id, success: false, errors: messages });
    return;
  }

  const simulator = new SystemSimulator({ system: result.system });

  simulator.compute();

  postMessage({ id: event.data.id, success: true, simulator });
};
