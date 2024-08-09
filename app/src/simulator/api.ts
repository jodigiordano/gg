import { SystemSimulator } from "@gg/core";
import { BlockSize } from "../helpers.js";
import { onTick, startTicker, tick, drawSimulation } from "../renderer/api.js";
import { state, pushChange } from "../state.js";
import { save } from "../persistence.js";
import { setJsonEditorValue } from "../jsonEditor.js";
import FlowPlayer from "./flowPlayer.js";
import WebWorker from "../worker.js";

//
// Initialize.
//

const worker = new WebWorker("simulator/worker.ts");

export async function loadSimulation(json: string): Promise<void> {
  return new Promise((resolve, reject) => {
    worker.onCodeLoaded(() => {
      worker.setReady();
      worker
        .sendOperation({
          operation: "initialize",
          json,
        })
        .then(data => {
          if (data.success) {
            // Set the new simulation in the state.
            state.simulator = new SystemSimulator(data.simulator as any);

            if (state.simulator.getSystem().flows.length) {
              state.flowPlayer = new FlowPlayer(
                state.simulator,
                state.simulator.getSystem().flows[0]!,
                state.flowKeyframe,
              );
            }

            const layout = state.simulator.getLayout();
            const boundaries = state.simulator.getBoundaries();
            const flow = state.simulator.getSystem().flows[0];

            drawSimulation(layout, boundaries, flow);

            // Play the flow, if needed.
            if (state.flowPlay && state.flowPlayer) {
              startTicker();
            }

            tick();

            state.simulatorInitialized = true;
            resolve();
          } else {
            for (const error of data.errors as string[]) {
              console.warn(error);
            }

            reject();
          }
        });
    });
  });
}

//
// Draw the simulation.
//

// Ticker to execute a step of the simulation.
export function initializeDrawingSimulation(): void {
  onTick(ticker => {
    if (state.flowPlayer) {
      if (state.flowPlay) {
        state.flowPlayer.update(
          ticker.deltaTime,
          state.flowPlayMode,
          state.flowSpeed,
        );
        state.flowKeyframe = Math.max(0, state.flowPlayer.getKeyframe());
      }

      state.flowPlayer.draw();
    }
  });
}

//
// Helpers
//

// Modifies the specification transactionally.
export async function modifySpecification(modifier: () => void): Promise<void> {
  const system = state.simulator.getSystem();

  // Make a copy of the specification.
  const currentSpecification = JSON.stringify(system.specification, null, 2);

  // Call a function that modifies the specification.
  modifier();

  // Try to apply the new configuration.
  const newSpecification = JSON.stringify(system.specification, null, 2);

  return new Promise(resolve => {
    loadSimulation(newSpecification)
      .then(() => {
        pushChange(newSpecification);
        save(newSpecification);
        setJsonEditorValue(newSpecification);
        resolve();
      })
      .catch(() => {
        // Rollback if the new configuration is invalid.
        loadSimulation(currentSpecification)
          .then(() => {
            resolve();
          })
          .catch(() => {
            /* NOOP */
          });
      });
  });
}

export function getSimulationBoundaries(): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const boundaries = state.simulator.getVisibleWorldBoundaries();

  const boundaryLeft = boundaries.left * BlockSize;
  const boundaryRight = boundaries.right * BlockSize;
  const boundaryTop = boundaries.top * BlockSize;
  const boundaryBottom = boundaries.bottom * BlockSize;

  const left = boundaryLeft - BlockSize; /* margin */
  const top = boundaryTop - BlockSize; /* margin */

  const width =
    boundaryRight - boundaryLeft + BlockSize + BlockSize * 2; /* margin */

  const height =
    boundaryBottom - boundaryTop + BlockSize + BlockSize * 2; /* margin */

  return {
    x: left + width / 2,
    y: top + height / 2,
    width,
    height,
  };
}

// Get the number of keyframes in the flow.
export function getKeyframesCount(): number {
  return Math.max(
    0,
    new Set(
      state.simulator
        .getSystem()
        .flows.at(0)
        ?.steps?.map(step => step.keyframe) ?? [],
    ).size - 1,
  );
}
