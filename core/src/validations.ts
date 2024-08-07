import { RuntimeLink, RuntimeSubsystem, RuntimeSystem } from "./runtime.js";
import { SystemMargin } from "./consts.js";
import { System, specification } from "./specification.js";

export class InvalidSystemError extends Error {
  details: unknown;

  constructor(details: unknown) {
    super();
    this.details = details;
  }
}

export interface ValidationError {
  path: string;
  message: string;
}

export function validate(
  system: System,
  runtime: RuntimeSystem,
): ValidationError[] {
  const validateAjv = specification.getSchema<System>("system")!;

  validateAjv(system);

  if (validateAjv.errors) {
    return validateAjv.errors.map(error => ({
      path: error.instancePath,
      message: `${error.message} (${JSON.stringify(error.params)})`,
    }));
  }

  const systemOverlapErrors = validateSystemOverlaps(runtime);
  const whiteBoxBoundaryErrors = validateWhiteboxBoundaries(runtime);
  const systemErrors = validateSystems(runtime, []);
  const linkErrors = validateLinks(runtime);
  const flowErrors = validateFlows(runtime);

  return systemOverlapErrors
    .concat(systemErrors)
    .concat(whiteBoxBoundaryErrors)
    .concat(linkErrors)
    .concat(flowErrors);
}

function validateSystemOverlaps(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < system.systems.length; i++) {
    for (let j = i + 1; j < system.systems.length; j++) {
      const subsystemA = system.systems[i]!;
      const subsystemB = system.systems[j]!;

      const aLeft = subsystemA.position.x - SystemMargin;
      const aRight =
        subsystemA.position.x + subsystemA.size.width + SystemMargin;
      const aTop = subsystemA.position.y - SystemMargin;
      const aBottom =
        subsystemA.position.y + subsystemA.size.height + SystemMargin;

      const bLeft = subsystemB.position.x - SystemMargin;
      const bRight =
        subsystemB.position.x + subsystemB.size.width + SystemMargin;
      const bTop = subsystemB.position.y - SystemMargin;
      const bBottom =
        subsystemB.position.y + subsystemB.size.height + SystemMargin;

      if (
        aLeft < bRight &&
        aRight > bLeft &&
        aTop < bBottom &&
        aBottom > bTop
      ) {
        errors.push({
          path: getSubsystemPath(subsystemA),
          message: `${subsystemA.id} overlaps with ${subsystemB.id}`,
        });
      }
    }
  }

  // Validate recursively.
  for (const subsystem of system.systems) {
    errors.push(...validateSystemOverlaps(subsystem));
  }

  return errors;
}

function validateWhiteboxBoundaries(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const subsystem of system.systems) {
    // i.e. in a whitebox.
    if (system.id && (subsystem.position.x < 0 || subsystem.position.y < 0)) {
      errors.push({
        path: getSubsystemPath(subsystem),
        message: `${subsystem.id} is out of bounds of ${system.id}`,
      });
    }

    // Validate recursively.
    errors.push(...validateWhiteboxBoundaries(subsystem));
  }

  return errors;
}

function validateSystems(
  system: RuntimeSystem | RuntimeSubsystem,
  foundIds: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const subsystem of system.systems) {
    // Duplicate id.
    if (foundIds.includes(subsystem.id)) {
      errors.push({
        path: getSubsystemPath(subsystem),
        message: "duplicate id",
      });
    } else {
      foundIds.push(subsystem.id);
    }

    // Validate recursively.
    errors.push(...validateSystems(subsystem, foundIds));
  }

  return errors;
}

function validateLinks(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const link of system.links) {
    // A <> A
    if (link.a === link.b) {
      errors.push({
        path: getLinkPath(link),
        message: "self-reference",
      });
    }

    // A <> B && B <> A
    // A.Y <> B.Y && B.Y <> A.Y
    if (
      system.links.some(
        other =>
          other.index !== link.index &&
          [other.a, other.b].sort().join("") ===
            [link.a, link.b].sort().join(""),
      )
    ) {
      errors.push({
        path: getLinkPath(link),
        message: "duplicate",
      });
    }

    if (!link.systemA) {
      errors.push({
        path: [getLinkPath(link), "a"].join("/"),
        message: "missing",
      });
    }

    if (!link.systemB) {
      errors.push({
        path: [getLinkPath(link), "b"].join("/"),
        message: "missing",
      });
    }

    if (link.systemA && link.systemA.systems.length) {
      errors.push({
        path: [getLinkPath(link), "a"].join("/"),
        message: "inaccurate",
      });
    }

    if (link.systemB && link.systemB.systems.length) {
      errors.push({
        path: [getLinkPath(link), "b"].join("/"),
        message: "inaccurate",
      });
    }
  }

  return errors;
}

function validateFlows(system: RuntimeSystem): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [flowIndex, flow] of system.flows.entries()) {
    for (const [stepIndex, step] of flow.steps.entries()) {
      if (!step.systemFrom) {
        errors.push({
          path: `/flows/${flowIndex}/steps/${stepIndex}/from`,
          message: "missing",
        });
      }

      if (!step.systemTo) {
        errors.push({
          path: `/flows/${flowIndex}/steps/${stepIndex}/to`,
          message: "missing",
        });
      }

      if (step.systemFrom && step.systemTo) {
        if (step.systemFrom.systems.length) {
          errors.push({
            path: `/flows/${flowIndex}/steps/${stepIndex}/from`,
            message: "inaccurate",
          });
        } else if (step.systemTo.systems.length) {
          errors.push({
            path: `/flows/${flowIndex}/steps/${stepIndex}/to`,
            message: "inaccurate",
          });
        } else if (!step.links.length) {
          errors.push({
            path: `/flows/${flowIndex}/steps/${stepIndex}`,
            message: "no path",
          });
        }
      }
    }
  }

  return errors;
}

function getSubsystemPath(subsystem: RuntimeSubsystem) {
  const breadcrumbs: (RuntimeSystem | RuntimeSubsystem)[] = [];

  let current: RuntimeSystem | RuntimeSubsystem | undefined = subsystem;

  while (current) {
    breadcrumbs.push(current);
    current = current.parent;
  }

  return breadcrumbs
    .reverse()
    .map(system => ("index" in system ? `/systems/${system.index}` : ""))
    .join("");
}

function getLinkPath(link: RuntimeLink) {
  return `/links/${link.index}`;
}
