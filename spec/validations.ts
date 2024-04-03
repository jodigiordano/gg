import {
  RuntimeComponent,
  RuntimeLimits,
  RuntimeSubsystem,
  RuntimeSystem,
} from "./loader";
import spec from "./specification";
import { System } from "./specificationTypes";

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
  const validateAjv = spec.getSchema<System>(
    "https://dataflows.io/system.json",
  )!;

  validateAjv(system);

  if (validateAjv.errors) {
    return validateAjv.errors.map((error) => ({
      path: error.instancePath,
      message: error.message ?? "",
    }));
  }

  const overlapErrors = validateOverlaps(runtime);
  const linkErrors = validateLinks(runtime);
  const outOfBoundsErrors = validateOutOfBounds(runtime);

  return overlapErrors.concat(linkErrors).concat(outOfBoundsErrors);
}

function validateOverlaps(system: RuntimeSubsystem): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const componentA of system.components) {
    for (const componentB of system.components) {
      if (componentA.name === componentB.name) {
        continue;
      }

      const componentATopRight = componentA.position.x + componentA.size.width;

      const componentABottomLeft =
        componentA.position.y + componentA.size.height;

      const componentBTopRight = componentB.position.x + componentB.size.width;

      const componentBBottomLeft =
        componentB.position.y + componentB.size.height;

      if (
        componentA.position.x <= componentBTopRight &&
        componentATopRight >= componentB.position.x &&
        componentA.position.y <= componentBBottomLeft &&
        componentABottomLeft >= componentB.position.y
      ) {
        errors.push({
          path: getComponentPath(componentA),
          message: `overlaps with component ${getComponentPath(componentB)}`,
        });
      }
    }

    if (componentA.system) {
      errors.push(...validateOverlaps(componentA.system as RuntimeSubsystem));
    }
  }

  return errors;
}

function validateLinks(_system: RuntimeSubsystem): ValidationError[] {
  // TODO
  // Ex: a link should point to existing components
  // Ex: a link should not point to circular components (a === b)
  // Ex: 2 links should not point to the same components
  return [];
}

function validateOutOfBounds(system: RuntimeSubsystem): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const component of system.components) {
    if (
      component.position.x + component.size.width >
        RuntimeLimits.MaxSystemWidth ||
      component.position.y + component.size.height >
        RuntimeLimits.MaxSystemHeight
    ) {
      errors.push({
        path: getComponentPath(component),
        message: "out of bounds",
      });
    }

    if (component.system) {
      errors.push(...validateOverlaps(component.system as RuntimeSubsystem));
    }
  }

  return errors;
}

function getComponentPath(component: RuntimeComponent) {
  const breadcrumbs: RuntimeComponent[] = [];

  let current: RuntimeComponent | undefined = component;

  while (current) {
    breadcrumbs.push(current);
    current = current.parentComponent;
  }

  return breadcrumbs
    .reverse()
    .map((c) => `/system/components/${c.index}/${c.name}`)
    .join("");
}
