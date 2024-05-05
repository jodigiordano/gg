import { readFileSync, mkdirSync, createWriteStream } from "node:fs";
import { loadYaml, RuntimeLimits } from "@dataflows/spec";
import { createCanvas, Canvas } from "canvas";
import { SystemSimulator, SimulatorObjectType } from "../index";

export function loadExample(name: string) {
  return loadYaml(
    readFileSync(
      [import.meta.dirname, `examples/${name}.yml`].join("/"),
      "utf8",
    ),
  );
}

const BlockSize = 8; // pixels.

export async function render(simulator: SystemSimulator) {
  const canvas = createCanvas(
    RuntimeLimits.MaxSystemWidth * BlockSize,
    RuntimeLimits.MaxSystemHeight * BlockSize,
  );

  const ctx = canvas.getContext("2d");

  // Clear to white.
  ctx.fillStyle = "#d9d9d9";
  ctx.fillRect(
    0,
    0,
    RuntimeLimits.MaxSystemWidth * BlockSize,
    RuntimeLimits.MaxSystemHeight * BlockSize,
  );

  // Draw objects.
  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      const objects = simulator.layout[i]![j]!;

      if (objects.at(-1)?.type === SimulatorObjectType.BlackBox) {
        ctx.fillStyle = "#e9d8a6";
      } else if (objects.at(-1)?.type === SimulatorObjectType.WhiteBox) {
        ctx.fillStyle = "#d9d9d9";
      } else if (
        objects.filter(obj => obj.type === SimulatorObjectType.Link).length > 1
      ) {
        ctx.fillStyle = "#0066ff";
      } else if (objects.at(-1)?.type === SimulatorObjectType.Link) {
        ctx.fillStyle = "#005f73";
      } else if (objects.at(-1)?.type === SimulatorObjectType.Port) {
        ctx.fillStyle = "#0066ff";
      } else if (objects.at(-1)?.type === SimulatorObjectType.PortPadding) {
        ctx.fillStyle = "#ee9b00";
      } else if (objects.at(-1)?.type === SimulatorObjectType.SystemTitle) {
        ctx.fillStyle = "red";
      } else if (
        objects.at(-1)?.type === SimulatorObjectType.SystemTitlePadding
      ) {
        ctx.fillStyle = "#e9d8a6";
      }

      if (objects.length) {
        ctx.fillRect(i * BlockSize, j * BlockSize, BlockSize, BlockSize);
      }
    }
  }

  // Draw grid.
  for (let i = 0; i < canvas.height; i += BlockSize) {
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
  }

  for (let i = 0; i < canvas.width; i += BlockSize) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
  }

  ctx.strokeStyle = "gray";
  ctx.stroke();

  await saveRender(canvas);
}

async function saveRender(canvas: Canvas): Promise<void> {
  return new Promise(resolve => {
    const folder = [import.meta.dirname, "tmp"].join("/");
    mkdirSync(folder, { recursive: true });

    const out = createWriteStream([folder, "output.png"].join("/"));
    const stream = canvas.createPNGStream();

    stream.pipe(out);
    out.on("finish", resolve);
  });
}
