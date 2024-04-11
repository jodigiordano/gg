import { Application, Sprite, Graphics } from "pixi.js";
import { loadYaml, RuntimeLimits } from "@dataflows/spec";
import {
  SystemSimulator,
  FlowSimulator,
  GridObjectType,
} from "@dataflows/simulator";
import { BlockSize } from "./consts.js";

const yaml = `
specificationVersion: 1.0.0
name: dataflows
description: Tool to build beautiful software system designs
components:
  - name: frontend
    description: Web-based client
    position:
      x: 2
      y: 2
  - name: backend
    description: Backend of the frontend
    position:
      x: 17
      y: 7
    system:
      components:
        - name: server
          description: RESTful HTTP API of the backend
          position:
            x: 2
            y: 2
        - name: database
          description: Database of the backend
          position:
            x: 10
            y: 2
      links:
        - name: l1
          componentAName: server
          componentBName: database
  - name: whatever
    position:
      x: 9
      y: 15
  - name: datadog
    position:
      x: 2
      y: 10
links:
  - name: l1
    componentAName: frontend
    componentBName: backend
    subComponentBName: server
  - name: l2
    componentAName: frontend
    componentBName: whatever
  - name: l3
    componentAName: datadog
    componentBName: backend
    subComponentBName: server
flows:
  - name: f1
    steps:
      - operation: send
        fromComponentName: frontend
        toComponentName: backend
        data: form data
        keyframe: 0
      - operation: send
        fromComponentName: backend.server
        toComponentName: datadog
        data: log
        keyframe: 1
      - operation: send
        fromComponentName: backend.server
        toComponentName: backend.database
        data: user
        keyframe: 1
`;

const { system } = loadYaml(yaml);
const simulator = new SystemSimulator(system);

export function getSystemBoundaries(): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  let left = RuntimeLimits.MaxSystemWidth;
  let right = 0;
  let top = RuntimeLimits.MaxSystemHeight;
  let bottom = 0;

  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      if (simulator.layout[i]![j] === GridObjectType.Empty) {
        continue;
      }

      if (i < left) {
        left = i;
      }

      if (i > right) {
        right = i;
      }

      if (j < top) {
        top = j;
      }

      if (j > bottom) {
        bottom = j;
      }
    }
  }

  return {
    left: left * BlockSize,
    right: right * BlockSize,
    top: top * BlockSize,
    bottom: bottom * BlockSize,
  };
}

export function getObjectsToRender(
  app: Application,
  center: { x: number; y: number },
): Sprite[] {
  const componentGraphic = new Graphics()
    .beginFill(0x000000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const componentTexture = app.renderer.generateTexture(componentGraphic);

  const linkGraphic = new Graphics()
    .beginFill(0xff0000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const linkTexture = app.renderer.generateTexture(linkGraphic);

  const toDraw: Sprite[] = [];

  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      const obj = simulator.layout[i]![j];

      if (obj === GridObjectType.Component) {
        const componentSprite = new Sprite(componentTexture);

        componentSprite.x = center.x + i * BlockSize;
        componentSprite.y = center.y + j * BlockSize;

        toDraw.push(componentSprite);
      } else if (obj === GridObjectType.Link) {
        const linkSprite = new Sprite(linkTexture);

        linkSprite.x = center.x + i * BlockSize;
        linkSprite.y = center.y + j * BlockSize;

        toDraw.push(linkSprite);
      }

      // if (obj === GridObjectType.Component || obj === GridObjectType.Link || obj === GridObjectType.Port || obj === GridObjectType.PortPadding) {
      //   if (obj === GridObjectType.Component) {
      //     ctx.fillStyle = "black";
      //   } else if (obj === GridObjectType.Link) {
      //     ctx.fillStyle = "green";
      //   } else if (obj === GridObjectType.Port) {
      //     ctx.fillStyle = "gray";
      //   } else if (obj === GridObjectType.PortPadding) {
      //     ctx.fillStyle = "red";
      //   }

      //   ctx.fillRect(
      //     i * BlockSize,
      //     j * BlockSize,
      //     BlockSize,
      //     BlockSize,
      //   );
      // }
    }
  }

  return toDraw;
}

export function getFlowToRender(
  app: Application,
  center: { x: number; y: number },
  flowName: string,
): Sprite[] {
  const toDraw: Sprite[] = [];

  const flowSimulation = new FlowSimulator(
    simulator,
    system.flows.find(flow => flow.name === flowName),
  );

  const data = flowSimulation.tick({ keyframe: 0, keyframeProgress: 0.5 });

  const dataGraphic = new Graphics()
    .beginFill(0x00ff00)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const dataTexture = app.renderer.generateTexture(dataGraphic);

  for (const d of data) {
    const sprite = new Sprite(dataTexture);

    sprite.x = center.x + d[0] * BlockSize;
    sprite.y = center.y + d[1] * BlockSize;
    console.log(d);

    toDraw.push(sprite);
  }

  return toDraw;
}
