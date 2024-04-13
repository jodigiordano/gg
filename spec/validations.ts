import {
  RuntimeLimits,
  RuntimeLink,
  RuntimeSubsystem,
  RuntimeSystem,
} from "./index";
import { System, specification } from "./specification";

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
  const validateAjv = specification.getSchema<System>(
    "https://dataflows.io/system.json",
  )!;

  validateAjv(system);

  if (validateAjv.errors) {
    return validateAjv.errors.map(error => ({
      path: error.instancePath,
      message: `${error.message} (${JSON.stringify(error.params)})`,
    }));
  }

  const systemOverlapErrors = validateSystemOverlaps(runtime);
  const systemErrors = validateSystems(runtime);
  const linkErrors = validateLinks(runtime);
  const systemBoundaryErrors = validateSystemBoundaries(runtime);

  return systemOverlapErrors
    .concat(systemErrors)
    .concat(linkErrors)
    .concat(systemBoundaryErrors);
}

function validateSystemOverlaps(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const subsystemA of system.systems) {
    for (const subsystemB of system.systems) {
      if (subsystemA.id === subsystemB.id) {
        continue;
      }

      const aTopRight = subsystemA.position.x + subsystemA.size.width;
      const aBottomLeft = subsystemA.position.y + subsystemA.size.height;
      const bTopRight = subsystemB.position.x + subsystemB.size.width;
      const bBottomLeft = subsystemB.position.y + subsystemB.size.height;

      if (
        subsystemA.position.x <= bTopRight &&
        aTopRight >= subsystemB.position.x &&
        subsystemA.position.y <= bBottomLeft &&
        aBottomLeft >= subsystemB.position.y
      ) {
        errors.push({
          path: getSubsystemPath(subsystemA),
          message: `overlaps with ${getSubsystemPath(subsystemB)}`,
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

function validateSystems(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  system.systems.forEach(subsystem => {
    // Duplicate id.
    if (
      system.systems.some(
        other => other.id === subsystem.id && other.index !== subsystem.index,
      )
    ) {
      errors.push({
        path: getSubsystemPath(subsystem),
        message: "duplicate id",
      });
    }

    // Validate recursively.
    errors.push(...validateSystems(subsystem));
  });

  return errors;
}

function validateLinks(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  system.links.forEach(link => {
    // A.Y <> A.Y
    // Done separately from A <> A validation to have a more specific error.
    if (link.a === link.b && (link.subA || link.subB)) {
      errors.push({
        path: getLinkPath(link),
        message: "self-reference sub-systems",
      });
      // A <> A
    } else if (link.a === link.b) {
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
          [other.a, other.subA, other.b, other.subB]
            .filter(x => x)
            .sort()
            .join("") ===
            [link.a, link.subA, link.b, link.subB]
              .filter(x => x)
              .sort()
              .join(""),
      )
    ) {
      errors.push({
        path: getLinkPath(link),
        message: "duplicate",
      });
    }

    const systemA = system.systems.find(subsystem => subsystem.id === link.a);
    const systemB = system.systems.find(subsystem => subsystem.id === link.b);

    if (!systemA) {
      errors.push({
        path: [getLinkPath(link), "a"].join("/"),
        message: "missing",
      });
    }

    if (!systemB) {
      errors.push({
        path: [getLinkPath(link), "b"].join("/"),
        message: "missing",
      });
    }

    if (
      systemA &&
      link.subA &&
      !systemA.systems.some(subsystem => subsystem.id === link.subA)
    ) {
      errors.push({
        path: [getLinkPath(link), "a"].join("/"),
        message: "missing",
      });
    }

    if (
      systemB &&
      link.subB &&
      !systemB.systems.some(subsystem => subsystem.id === link.subB)
    ) {
      errors.push({
        path: [getLinkPath(link), "b"].join("/"),
        message: "missing",
      });
    }
  });

  // Validate recursively.
  system.systems.forEach(subsystem => {
    errors.push(...validateLinks(subsystem));
  });

  return errors;
}

function validateSystemBoundaries(
  system: RuntimeSystem | RuntimeSubsystem,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const subsystem of system.systems) {
    if (
      subsystem.position.x + subsystem.size.width >
        RuntimeLimits.MaxSystemWidth ||
      subsystem.position.y + subsystem.size.height >
        RuntimeLimits.MaxSystemHeight
    ) {
      errors.push({
        path: getSubsystemPath(subsystem),
        message: "out of bounds",
      });
    }

    // Validate recursively.
    errors.push(...validateSystemBoundaries(subsystem));
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
  const breadcrumbs: (RuntimeSystem | RuntimeSubsystem)[] = [];

  let current: RuntimeSystem | RuntimeSubsystem | undefined = link.system;

  while (current) {
    breadcrumbs.push(current);
    current = current.parent;
  }

  return breadcrumbs
    .reverse()
    .map(system => ("index" in system ? `/systems/${system.index}` : ""))
    .join("")
    .concat(`/links/${link.index}`);
}
