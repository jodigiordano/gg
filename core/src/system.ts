import { RuntimeSystem, RuntimeSubsystem, RuntimeLink } from "./runtime.js";
import { sanitizeTitle, getTitleLength } from "./helpers.js";
import { Subsystem } from "./specification.js";
import * as Box from "./systems/box.js";
import * as List from "./systems/list.js";

export function initSystem(
  system: RuntimeSubsystem,
  parent: RuntimeSystem | RuntimeSubsystem,
  specification: Subsystem,
  parentIndex: number,
  depth: number,
): void {
  // Set the type.
  system.type ??= "box";

  // Initialize sub-systems.
  system.systems ??= [];

  // Set the specification.
  system.specification = specification;

  // Set array position in the parent.
  system.index = parentIndex;

  // Set the parent system.
  system.parent = parent;

  // Set the title.
  system.title = sanitizeTitle(system.title ?? system.id);

  // Set the title size.
  system.titleSize ??= getTitleLength(system.title);

  // Set the title font.
  system.titleFont ??= "text";

  // Set the title alignment.
  system.titleAlign ??= "left";

  // Set the depth.
  system.depth = depth;

  // Set the border.
  system.borderPattern ??= "light";

  // Set the opacity.
  system.opacity ??= 1;

  // Set title margin.
  computeTitleMargin(system);

  // Set padding.
  computePadding(system);

  // Set margin.
  computeMargin(system);
}

export function getRootSystem(system: RuntimeSubsystem): RuntimeSystem {
  let rootSystem: RuntimeSystem = system as unknown as RuntimeSystem;

  while (rootSystem.parent) {
    rootSystem = rootSystem.parent;
  }

  return rootSystem;
}

export function computeSystemSize(
  system: RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  if (system.type === "box") {
    Box.computeSize(system, links);
  } /* list */ else {
    List.computeSize(system, links);
  }
}

export function computeTitleMargin(system: RuntimeSubsystem): void {
  if (system.type === "box") {
    Box.computeTitleMargin(system);
  } /* list */ else {
    List.computeTitleMargin(system);
  }
}

function computePadding(system: RuntimeSubsystem): void {
  if (system.type === "box") {
    Box.computePadding(system);
  } /* list */ else {
    List.computePadding(system);
  }
}

function computeMargin(system: RuntimeSubsystem): void {
  if (system.type === "box") {
    Box.computeMargin(system);
  } /* list */ else {
    List.computeMargin(system);
  }
}
