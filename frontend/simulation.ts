import * as PIXI from 'pixi.js';
import { loadYaml, RuntimeLimits } from "@dataflows/spec";
import { Simulator, GridObjectType } from '@dataflows/simulator';
import { BlockSize } from './consts.js';

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
    componentAName: backend
    componentBName: datadog
    subComponentBName: server
`;

const { system } = loadYaml(yaml);
const simulator = new Simulator(system);

export function getObjectsToRender(app: PIXI.Application<HTMLCanvasElement>, center: { x: number, y: number }): PIXI.Sprite[] {
  const componentGraphic = new PIXI.Graphics()
    .beginFill(0x000000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const componentTexture = app.renderer.generateTexture(componentGraphic);

  const linkGraphic = new PIXI.Graphics()
    .beginFill(0xFF0000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const linkTexture = app.renderer.generateTexture(linkGraphic);

  const toDraw: PIXI.Sprite[] = [];

  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      const obj = simulator.layout[i]![j];

      if (obj === GridObjectType.Component) {
        const componentSprite = new PIXI.Sprite(componentTexture);

        componentSprite.x = center.x + i * BlockSize;
        componentSprite.y = center.y + j * BlockSize;

        toDraw.push(componentSprite);
      } else if (obj === GridObjectType.Link) {
        const linkSprite = new PIXI.Sprite(linkTexture);

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
