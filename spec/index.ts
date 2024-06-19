import { load as parseYaml } from "js-yaml";
import {
  Link as SpecLink,
  System as SpecSystem,
  Subsystem as SpecSubsystem,
  Flow as SpecFlow,
  FlowStep as SpecFlowStep,
} from "./specification";
import { validate, ValidationError as VError } from "./validations";

export type ValidationError = VError;
export type Link = SpecLink;
export type System = SpecSystem;
export type Subsystem = SpecSubsystem;
export type Flow = SpecFlow;
export type FlowStep = SpecFlowStep;

// Each system has a margin to make room for ports & routing.
export const SystemMargin = 1;

export const TitleCharsPerSquare = 2;

export const PaddingWhiteBox = 2;

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
  specification: Link;
  index: number;
  systemA: RuntimeSubsystem;
  systemB: RuntimeSubsystem;
}

export interface RuntimeSubsystem extends Subsystem {
  specification: Subsystem;
  canonicalId: string;
  title: string;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  index: number;
  size: RuntimeSize;
  position: RuntimePosition;
  ports: RuntimePort[];
  parent?: RuntimeSystem | RuntimeSubsystem;
  hideSystems: boolean;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  depth: number;
}

export interface RuntimeSystem extends System {
  specification: System;
  canonicalId: undefined;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  size: RuntimeSize;
  position: RuntimePosition;
  parent?: undefined;
  hideSystems: false;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  flows: RuntimeFlow[];
  depth: 0;
}

export interface RuntimeFlowStep extends FlowStep {
  specification: FlowStep;
  systemFrom: RuntimeSubsystem;
  systemTo: RuntimeSubsystem;
  links: RuntimeLink[];
}

export interface RuntimeFlow extends Flow {
  specification: Flow;
  index: number;
  steps: RuntimeFlowStep[];
}

export function load(system: System): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  const runtime = structuredClone(system) as RuntimeSystem;

  runtime.specification = system;
  runtime.links ??= [];
  runtime.titlePosition = { x: 0, y: 0 };
  runtime.titleSize = { width: 0, height: 0 };
  runtime.size = { width: 0, height: 0 };
  runtime.depth = 0;
  runtime.position = { x: 0, y: 0 };

  // TODO: we are enhancing a system that wasn't validated with AJV yet,
  // TODO: so it's the far west in the JSON file.
  // TODO: validate with AJV first, then enhance if possible.

  enhanceSubsystems(runtime);
  enhanceLinks(runtime);
  enhanceFlows(runtime);
  computeSizes(runtime, runtime.links);
  computePorts(runtime);

  const errors = validate(system, runtime);

  return { system: runtime, errors };
}

export function loadYaml(yaml: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  return load(parseYaml(yaml) as System);
}

function enhanceSubsystems(
  system: RuntimeSystem | RuntimeSubsystem,
  depth = 1,
): void {
  system.systems ??= [];

  system.systems.forEach((subsystem, index) => {
    // Set the specification.
    subsystem.specification = system.specification.systems!.at(index)!;

    // Set array position in the system.
    subsystem.index = index;

    // Set the parent system.
    subsystem.parent = system;

    // Set the title, if necessary.
    subsystem.title ??= subsystem.id;

    // Set hide systems default value.
    subsystem.hideSystems ??= false;

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

    // Set the depth.
    subsystem.depth = depth;

    // Enhance recursively.
    enhanceSubsystems(subsystem, depth + 1);
  });
}

function enhanceLinks(system: RuntimeSystem): void {
  system.links.forEach((link, index) => {
    // Set the specification.
    link.specification = system.specification.links!.at(index)!;

    // Set array position in the system.
    link.index = index;

    // Set system A.
    let systemA: RuntimeSubsystem | RuntimeSystem | undefined = system;

    link.a.split(".").forEach(subsystemId => {
      if (systemA) {
        systemA = systemA.systems.find(ss => ss.id === subsystemId);
      }
    });

    link.systemA = systemA as unknown as RuntimeSubsystem;

    // Set system B.
    let systemB: RuntimeSubsystem | RuntimeSystem | undefined = system;

    link.b.split(".").forEach(subsystemId => {
      if (systemB) {
        systemB = systemB.systems.find(ss => ss.id === subsystemId);
      }
    });

    link.systemB = systemB as unknown as RuntimeSubsystem;
  });
}

function enhanceFlows(system: RuntimeSystem): void {
  system.flows ??= [];

  system.flows.forEach((flow, index) => {
    // Set the specification.
    flow.specification = system.specification.flows!.at(index)!;

    // Set array position.
    flow.index = index;

    // Normalize keyframes.
    // TODO: put in "normalizedKeyframe" so errors are reported on "keyframe".
    const uniqueKeyframes = new Set<number>();

    flow.steps.forEach(step => {
      uniqueKeyframes.add(step.keyframe);
    });

    const keyframes = Array.from(uniqueKeyframes).sort();

    flow.steps.forEach((step, index) => {
      // Set the specification.
      step.specification = flow.specification.steps.at(index)!;

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

function computeSizes(
  system: RuntimeSystem | RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  // Depth-first traversal.
  for (const subsystem of system.systems) {
    computeSizes(subsystem, links);
  }

  // Root system.
  if (!system.canonicalId) {
    return;
  }

  const linksCount = links.filter(
    link =>
      link.a.startsWith(system.canonicalId) ||
      link.b.startsWith(system.canonicalId),
  ).length;

  const sizeToSupportLinks: RuntimeSize = {
    width: 3 + (Math.ceil((linksCount - 2) / 2) | 0),
    height: 3,
  };

  // Blackbox.
  if (!system.systems.length) {
    system.size = {
      width: Math.max(
        sizeToSupportLinks.width,
        system.titleSize.width + 2 * TitlePadding,
      ),
      height: Math.max(
        sizeToSupportLinks.height,
        system.titleSize.height + 2 * TitlePadding,
      ),
    };

    return;
  }

  // Whitebox
  let maxWidth = 0;
  let maxHeight = 0;

  for (const subsystem of system.systems) {
    const width = subsystem.position.x + subsystem.size.width;
    const height = subsystem.position.y + subsystem.size.height;

    if (width > maxWidth) {
      maxWidth = width;
    }

    if (height > maxHeight) {
      maxHeight = height;
    }
  }

  // +----------------------+
  // | Title                |
  // | +-----+    +-----+   |
  // | | Foo |====| Bar |   |
  // | +-----+    +-----+   |
  // +----------------------+

  if (system.titleSize.width > maxWidth) {
    maxWidth = system.titleSize.width;
  }

  system.size = {
    width: maxWidth + PaddingWhiteBox * 2,
    height: maxHeight + system.titleSize.height + PaddingWhiteBox * 2,
  };
}

function computePorts(system: RuntimeSystem | RuntimeSubsystem) {
  for (const subsystem of system.systems) {
    for (let x = 1; x < subsystem.size.width; x += 2) {
      subsystem.ports.push({ x, y: -1 });
      subsystem.ports.push({ x, y: subsystem.size.height });
    }

    for (let y = 1; y < subsystem.size.height; y += 2) {
      subsystem.ports.push({ x: -1, y });
      subsystem.ports.push({ x: subsystem.size.width, y });
    }

    // Compute recursively.
    computePorts(subsystem);
  }
}
