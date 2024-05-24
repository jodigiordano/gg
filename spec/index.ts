import { load as parseYaml } from "js-yaml";
import { Link, System, Subsystem, Flow, FlowStep } from "./specification";
import { validate, ValidationError as VError } from "./validations";

export type ValidationError = VError;

export const TitleCharsPerSquare = 2;

const TitlePadding = 1;

// Must reflect https://dataflows.io/system.json
export const RuntimeLimits = {
  MaxSystemWidth: 64,
  MaxSystemHeight: 64,
};

export interface RuntimeSize {
  width: number;
  height: number;
}

export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimePort extends RuntimePosition {}

export interface RuntimeLink extends Link {
  index: number;
  systemA: RuntimeSubsystem;
  systemB: RuntimeSubsystem;
}

export interface RuntimeSubsystem extends Subsystem {
  canonicalId: string;
  title: string;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  index: number;
  size: RuntimeSize;
  position: RuntimePosition;
  ports: RuntimePort[];
  parent?: RuntimeSystem | RuntimeSubsystem;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
}

export interface RuntimeSystem extends System {
  canonicalId: undefined;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  parent?: undefined;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  flows: RuntimeFlow[];
}

export interface RuntimeFlowStep extends FlowStep {
  systemFrom: RuntimeSubsystem;
  systemTo: RuntimeSubsystem;
  links: RuntimeLink[];
}

export interface RuntimeFlow extends Flow {
  index: number;
  steps: RuntimeFlowStep[];
}

export function load(system: System): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  const runtime = structuredClone(system) as RuntimeSystem;

  runtime.links ??= [];
  runtime.titlePosition = { x: 0, y: 0 };
  runtime.titleSize = { width: 0, height: 0 };

  // TODO: we are enhancing a system that wasn't validated with AJV yet,
  // TODO: so it's the far west in the JSON file.
  // TODO: validate with AJV first, then enhance if possible.

  enhanceSubsystems(runtime);
  enhanceLinks(runtime);
  enhanceFlows(runtime);
  computePositions(runtime);
  computeSizes(runtime, runtime.links);

  const errors = validate(system, runtime);

  return { system: runtime, errors };
}

export function loadYaml(yaml: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  return load(parseYaml(yaml) as System);
}

function enhanceSubsystems(system: RuntimeSystem | RuntimeSubsystem): void {
  system.systems ??= [];

  system.systems.forEach((subsystem, index) => {
    // Set array position in the system.
    subsystem.index = index;

    // Set the parent system.
    subsystem.parent = system;

    // Set the title, if necessary.
    subsystem.title ??= subsystem.id;

    // TODO: Support titles with newlines.
    subsystem.titleSize = {
      width: Math.ceil(subsystem.title.length / TitleCharsPerSquare) | 0,
      height: 1,
    };

    subsystem.titlePosition = {
      x: TitlePadding,
      y: TitlePadding,
    };

    // Initialize ports.
    subsystem.ports = [];

    // Build its canonical id.
    subsystem.canonicalId = [system.canonicalId, subsystem.id]
      .filter(x => x)
      .join(".");

    // Enhance recursively.
    enhanceSubsystems(subsystem);
  });
}

function enhanceLinks(system: RuntimeSystem | RuntimeSubsystem): void {
  system.links.forEach((link, index) => {
    // Set array position in the system.
    link.index = index;

    // Set system A.
    let systemA: RuntimeSubsystem | RuntimeSystem | undefined = system;

    link.a.split(".").forEach(subsystemId => {
      if (systemA) {
        systemA = systemA.systems.find(ss => ss.id === subsystemId);
      }
    });

    link.systemA = systemA as RuntimeSubsystem;

    // Set system B.
    let systemB: RuntimeSubsystem | RuntimeSystem | undefined = system;

    link.b.split(".").forEach(subsystemId => {
      if (systemB) {
        systemB = systemB.systems.find(ss => ss.id === subsystemId);
      }
    });

    link.systemB = systemB as RuntimeSubsystem;
  });
}

function enhanceFlows(system: RuntimeSystem): void {
  system.flows ??= [];

  system.flows.forEach((flow, index) => {
    // Set array position.
    flow.index = index;

    // Normalize keyframes.
    // TODO: put in "normalizedKeyframe" so errors are reported on "keyframe".
    const uniqueKeyframes = new Set<number>();

    flow.steps.forEach(step => {
      uniqueKeyframes.add(step.keyframe);
    });

    const keyframes = Array.from(uniqueKeyframes).sort();

    flow.steps.forEach(step => {
      // Set normalized keyframe.
      step.keyframe = keyframes.indexOf(step.keyframe);

      // Set systemFrom.
      let systemFrom: RuntimeSystem | RuntimeSubsystem | undefined = system;

      for (const subsystemId of step.from.split(".")) {
        systemFrom = systemFrom.systems.find(ss => ss.id === subsystemId);

        if (!systemFrom) {
          break;
        }
      }

      step.systemFrom = systemFrom as RuntimeSubsystem;

      // Set systemTo.
      let systemTo: RuntimeSystem | RuntimeSubsystem | undefined = system;

      for (const subsystemId of step.to.split(".")) {
        systemTo = systemTo.systems.find(ss => ss.id === subsystemId);

        if (!systemTo) {
          break;
        }
      }

      step.systemTo = systemTo as RuntimeSubsystem;

      // Set links.
      step.links ??= [];

      if (step.systemFrom && step.systemTo) {
        step.links = findLinks(system.links, step.from, step.to);
      }
    });
  });
}

function findLinks(
  links: RuntimeLink[],
  from: string,
  to: string,
): RuntimeLink[] {
  const systemNameToNumber = new Map<string, number>();

  let nextNumber = 0;

  for (const link of links) {
    if (!systemNameToNumber.has(link.a)) {
      systemNameToNumber.set(link.a, nextNumber);
      nextNumber += 1;
    }

    if (!systemNameToNumber.has(link.b)) {
      systemNameToNumber.set(link.b, nextNumber);
      nextNumber += 1;
    }
  }

  if (
    systemNameToNumber.get(from) === undefined ||
    systemNameToNumber.get(to) === undefined
  ) {
    return [];
  }

  const numberToSystemName = new Array(systemNameToNumber.size);

  systemNameToNumber.forEach((index, subsystemName) => {
    numberToSystemName[index] = subsystemName;
  });

  const graph = new Array<number[]>(systemNameToNumber.size);

  for (let i = 0; i < systemNameToNumber.size; i++) {
    graph[i] = [];
  }

  for (const link of links) {
    graph[systemNameToNumber.get(link.a)!]!.push(
      systemNameToNumber.get(link.b)!,
    );
    graph[systemNameToNumber.get(link.b)!]!.push(
      systemNameToNumber.get(link.a)!,
    );
  }

  const breadcrumbs = Array<number>(systemNameToNumber.size).fill(-1);
  const distances = Array<number>(systemNameToNumber.size).fill(Infinity);
  const queue = [systemNameToNumber.get(from)!];

  distances[systemNameToNumber.get(from)!] = 0;

  while (queue.length) {
    const node = queue.shift()!;

    for (const neighbor of graph[node]!) {
      if (distances[neighbor] === Infinity) {
        breadcrumbs[neighbor] = node;
        distances[neighbor] = distances[node]! + 1;

        queue.push(neighbor);
      }
    }
  }

  if (distances[systemNameToNumber.get(to)!] === Infinity) {
    return [];
  }

  const pathIndexes = [systemNameToNumber.get(to)!];

  let currentNode = systemNameToNumber.get(to)!;

  while (breadcrumbs[currentNode] !== -1) {
    pathIndexes.push(breadcrumbs[currentNode]!);

    currentNode = breadcrumbs[currentNode]!;
  }

  const pathSystems = pathIndexes
    .reverse()
    .map(index => numberToSystemName[index]);

  const pathLinks: RuntimeLink[] = [];

  for (let i = 0; i < pathSystems.length - 1; i++) {
    const link = links.find(
      l =>
        (l.a === pathSystems[i] && l.b === pathSystems[i + 1]) ||
        (l.b === pathSystems[i] && l.a === pathSystems[i + 1]),
    )!;

    pathLinks.push(link);
  }

  return pathLinks;
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

function computeSizes(
  system: RuntimeSystem | RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  for (const subsystem of system.systems) {
    const linksCount = links.filter(
      link =>
        link.a.startsWith(subsystem.canonicalId) ||
        link.b.startsWith(subsystem.canonicalId),
    ).length;

    const sizeToSupportLinks: RuntimeSize = {
      width: 3 + (Math.ceil((linksCount - 2) / 2) | 0),
      height: 3,
    };

    subsystem.size = {
      width: Math.max(
        sizeToSupportLinks.width,
        subsystem.titleSize.width + 2 * TitlePadding,
      ),
      height: Math.max(
        sizeToSupportLinks.height,
        subsystem.titleSize.height + 2 * TitlePadding,
      ),
    };

    // Allowed size: 3, 5, 7, ...
    if ((subsystem.size.width - 3) % 2 !== 0) {
      subsystem.size.width += 1;
    }

    // Allowed size: 3, 5, 7, ...
    if ((subsystem.size.height - 3) % 2 !== 0) {
      subsystem.size.height += 1;
    }

    for (let x = 1; x < subsystem.size.width; x += 2) {
      subsystem.ports.push({ x, y: -1 });
      subsystem.ports.push({ x, y: subsystem.size.height });
    }

    for (let y = 1; y < subsystem.size.height; y += 2) {
      subsystem.ports.push({ x: -1, y });
      subsystem.ports.push({ x: subsystem.size.width, y });
    }

    computeSizes(subsystem, links);
  }
}
