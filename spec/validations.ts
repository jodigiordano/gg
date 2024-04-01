import spec from "./specification";
import { System } from "./types";

export class InvalidSystemError extends Error {
  details: unknown;

  constructor(details: unknown) {
    super();
    this.details = details;
  }
}

export interface ValidationResult {
  errors: ValidationDetail[];
  warnings: ValidationDetail[];
}

export interface ValidationDetail {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  message: string | undefined;
  detailedMessage?: string;
  params?: Record<string, unknown>;
}

export function validate(system: System): void {
  const validateAjv = spec.getSchema<System>(
    "https://dataflows.io/system.json",
  )!;

  validateAjv(system);

  if (validateAjv.errors) {
    throw new InvalidSystemError(validateAjv.errors);
  }

  const overlaps = validateOverlaps(system);

  if (overlaps.errors.length) {
    throw new InvalidSystemError(overlaps.errors);
  }

  const links = validateLinks(system);

  if (links.errors.length) {
    throw new InvalidSystemError(links.errors);
  }
}

function validateOverlaps(_system: System): ValidationResult {
  // TODO
  // Ex: 2 components should not overlap.
  return { errors: [], warnings: [] };
}

function validateLinks(_system: System): ValidationResult {
  // TODO
  // Ex: a link should point to existing components
  // Ex: a link should not point to circular components (a === b)
  // Ex: 2 links should not point to the same components
  return { errors: [], warnings: [] };
}
