import { load as parseYaml } from "js-yaml";
import { Link, System, Subsystem, Flow } from "./specification";
import { validate, ValidationError } from "./validations";

// Must reflect https://dataflows.io/system.json
export const RuntimeLimits = {
  MaxSystemWidth: 64,
  MaxSystemHeight: 64,
};

export interface RuntimeSystemSize {
  width: number;
  height: number;
}

export interface RuntimePort {
  x: number;
  y: number;
}

export interface RuntimeLink extends Link {
  index: number;
  system?: RuntimeSystem | RuntimeSubsystem;
  a: string;
  subA: string | undefined;
  b: string;
  subB: string | undefined;
}

export interface RuntimeSubsystem extends Subsystem {
  index: number;
  size: RuntimeSystemSize;
  position: { x: number; y: number };
  ports: RuntimePort[];
  parent?: RuntimeSystem | RuntimeSubsystem;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
}

export interface RuntimeSystem extends System {
  parent?: undefined;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  flows: RuntimeFlow[];
}

export interface RuntimeFlow extends Flow {}

export function load(system: System): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  const runtime = structuredClone(system) as RuntimeSystem;

  enhanceSystems(runtime);
  enhanceLinks(runtime);
  enhanceFlows(runtime);
  computePositions(runtime);
  computeSizes(runtime);

  const errors = validate(system, runtime);

  return { system: runtime, errors };
}

export function loadYaml(yaml: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  return load(parseYaml(yaml) as System);
}

function enhanceSystems(system: RuntimeSystem | RuntimeSubsystem): void {
  system.systems ??= [];
  system.links ??= [];

  system.systems.forEach((subsystem, index) => {
    // Set array position in the system.
    subsystem.index = index;

    // Set the parent system.
    subsystem.parent = system;

    // Enhance recursively.
    enhanceSystems(subsystem);
  });
}

function enhanceLinks(system: RuntimeSystem | RuntimeSubsystem): void {
  system.links.forEach((link, index) => {
    // Set array position in the system.
    link.index = index;

    // Set the system.
    link.system = system;

    // Split the references in system / sub-system.
    const [a, subA, ..._restA] = link.a.split(".");

    link.a = a!;
    link.subA = subA;

    const [b, subB, ..._restB] = link.b.split(".");

    link.b = b!;
    link.subB = subB;
  });

  // Enhance recursively.
  system.systems.forEach(subsystem => {
    enhanceLinks(subsystem);
  });
}

function enhanceFlows(system: RuntimeSystem): void {
  system.flows ??= [];

  system.flows.forEach(flow => {
    const uniqueKeyframes = new Set<number>();

    flow.steps.forEach(step => {
      uniqueKeyframes.add(step.keyframe);
    });

    const keyframes = Array.from(uniqueKeyframes).sort();

    flow.steps.forEach(step => {
      step.keyframe = keyframes.indexOf(step.keyframe);
    });
  });
}

function computePositions(system: RuntimeSystem | RuntimeSubsystem): void {
  let farRight = 0;

  for (const subsystem of system.systems) {
    if (subsystem.position) {
      farRight = Math.max(farRight, subsystem.position.x);
    } else {
      subsystem.position = {
        x: farRight + 10,
        y: 0,
      };

      farRight = subsystem.position.x;
    }

    computePositions(subsystem);
  }
}

//  0 - 4 links
// +--+--+--+
// |  |  |  |
// +--+--+--+
// |  |  |  |
// +--+--+--+
// |  |  |  |
// +--+--+--+
//
//
//  5 - 6 links
// +--+--+--+--+--+
// |  |  |  |  |  |
// +--+--+--+--+--+
// |  |  |  |  |  |
// +--+--+--+--+--+
// |  |  |  |  |  |
// +--+--+--+--+--+
//
//  7 - 8 links
// +--+--+--+--+--+-- etc.
// |  |  |  |  |  |
// +--+--+--+--+--+-- etc.
// |  |  |  |  |  |
// +--+--+--+--+--+-- etc.
// |  |  |  |  |  |
// +--+--+--+--+--+-- etc.
//
function computeSizes(system: RuntimeSystem | RuntimeSubsystem): void {
  for (const subsystem of system.systems) {
    let linksCount = system.links.filter(
      link => link.a === subsystem.id || link.b === subsystem.id,
    ).length;

    if (subsystem.parent) {
      linksCount += subsystem.parent.links.filter(
        link => link.subA === subsystem.id || link.subB === subsystem.id,
      ).length;
    }

    if (linksCount <= 4) {
      subsystem.size = {
        width: 3,
        height: 3,
      };

      subsystem.ports = [
        { x: subsystem.position.x + 1, y: subsystem.position.y - 1 },
        {
          x: subsystem.position.x + subsystem.size.width,
          y: subsystem.position.y + 1,
        },
        {
          x: subsystem.position.x + 1,
          y: subsystem.position.y + subsystem.size.height,
        },
        { x: subsystem.position.x - 1, y: subsystem.position.y + 1 },
      ];
    } else {
      subsystem.size = {
        width: 3 + ((linksCount - 4) % 2),
        height: 3,
      };

      subsystem.ports = [
        { x: subsystem.position.x - 1, y: subsystem.position.y + 1 },
        {
          x: subsystem.position.x + subsystem.size.width,
          y: subsystem.position.y + 1,
        },
      ];

      for (
        let x = subsystem.position.x + 1;
        x < subsystem.position.x + subsystem.size.width;
        x += 2
      ) {
        subsystem.ports.push({ x, y: subsystem.position.y - 1 });
        subsystem.ports.push({
          x,
          y: subsystem.position.y + subsystem.size.height,
        });
      }
    }

    computeSizes(subsystem);
  }
}
