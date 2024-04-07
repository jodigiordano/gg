import fs from "node:fs";
import { loadFile, RuntimeLimits } from "@dataflows/spec";
import { createCanvas, Canvas } from "canvas";
import { GridObjectType, Simulator } from '../index';

export function loadExample(name: string) {
  return loadFile(
    [
      import.meta.dirname,
      `../node_modules/@dataflows/spec/examples/${name}.yml`,
    ].join("/"),
  );
}

const BlockSize = 8; // pixels.

export async function render(simulator: Simulator) {
  const canvas = createCanvas(
    RuntimeLimits.MaxSystemWidth * BlockSize,
    RuntimeLimits.MaxSystemHeight * BlockSize,
  );

  const ctx = canvas.getContext("2d");

  // Clear to white.
  ctx.fillStyle = "white";
  ctx.fillRect(
    0,
    0,
    RuntimeLimits.MaxSystemWidth * BlockSize,
    RuntimeLimits.MaxSystemHeight * BlockSize,
  );

  // Draw objects.
  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      const obj = simulator.layout[i]![j];

      if (obj === GridObjectType.Component || obj === GridObjectType.Link || obj === GridObjectType.Port || obj === GridObjectType.PortPadding) {
        if (obj === GridObjectType.Component) {
          ctx.fillStyle = "black";
        } else if (obj === GridObjectType.Link) {
          ctx.fillStyle = "green";
        } else if (obj === GridObjectType.Port) {
          ctx.fillStyle = "gray";
        } else if (obj === GridObjectType.PortPadding) {
          ctx.fillStyle = "red";
        }

        ctx.fillRect(
          i * BlockSize,
          j * BlockSize,
          BlockSize,
          BlockSize,
        );
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

  ctx.strokeStyle = 'gray';
  ctx.stroke();

  await saveRender(canvas);
}

async function saveRender(canvas: Canvas): Promise<void> {
  return new Promise((resolve) => {
    const folder = [import.meta.dirname, "tmp"].join("/");
    fs.mkdirSync(folder, { recursive: true });

    const out = fs.createWriteStream([folder, "output.png"].join("/"));
    const stream = canvas.createPNGStream();

    stream.pipe(out);
    out.on("finish", resolve);
  });
}
