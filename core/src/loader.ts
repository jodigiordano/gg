import { RuntimeSystem, RuntimeSubsystem, RuntimeLink } from "./runtime.js";
import { System } from "./specification.js";
import { validate, ValidationError, ValidationWarning } from "./validations.js";
import { computeSystemSize, initSystem } from "./system.js";
import { initLink } from "./link.js";

export function load(system: System): {
  system: RuntimeSystem;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const runtime = structuredClone(system) as RuntimeSystem;

  runtime.specification = system;
  runtime.links ??= [];
  runtime.titleSize = { width: 0, height: 0 };
  runtime.size = { width: 0, height: 0 };
  runtime.depth = 0;
  runtime.position = { x: 0, y: 0 };

  runtime.titleMargin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  runtime.padding = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  runtime.margin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  // TODO: we are enhancing a system that wasn't validated with AJV yet,
  // TODO: so it's the far west in the JSON file.
  // TODO: validate with AJV first, then enhance if possible.

  enhanceSubsystems(runtime);
  enhanceLinks(runtime);
  computeSizes(runtime, runtime.links);

  const { errors, warnings } = validate(system, runtime);

  return { system: runtime, errors, warnings };
}

export function loadJSON(json: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  return load(JSON.parse(json) as System);
}

function enhanceSubsystems(
  system: RuntimeSystem | RuntimeSubsystem,
  depth = 1,
): void {
  system.systems ??= [];

  for (const [index, subsystem] of system.systems.entries()) {
    initSystem(
      subsystem,
      system,
      system.specification.systems!.at(index)!,
      index,
      depth,
    );

    // Enhance recursively.
    enhanceSubsystems(subsystem, depth + 1);
  }
}

function enhanceLinks(system: RuntimeSystem): void {
  for (const [index, link] of system.links.entries()) {
    initLink(link, system.specification.links!.at(index)!, system, index);
  }
}

function computeSizes(
  system: RuntimeSystem | RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  // Recursive traversal.
  for (const subsystem of system.systems) {
    computeSizes(subsystem, links);
  }

  // Root system.
  if (!system.id) {
    return;
  }

  computeSystemSize(system, links);
}
