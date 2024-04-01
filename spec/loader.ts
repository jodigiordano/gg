import { readFileSync } from "node:fs";
import { load as parseYaml } from "js-yaml";
import { Component, Link, System, Subsystem } from "./specificationTypes";
import { validate, ValidationError } from "./validations";

export const RuntimeLimits = {
  MaxSystemWidth: 128, // Based on Simcity 2000.
  MaxSystemHeight: 128, // Based on Simcity 2000.
};

export interface RuntimeComponentSize {
  width: number;
  height: number;
}

export interface RuntimeComponent extends Component {
  arrayPosition: number;
  size: RuntimeComponentSize;
  parentComponent?: RuntimeComponent;
  parentSystem?: RuntimeSubsystem;
}

export interface RuntimeLink extends Link {
  arrayPosition: number;
  parentLink?: RuntimeLink;
  parentSystem?: RuntimeSubsystem;
}

export interface RuntimeSubsystem extends Subsystem {
  components: RuntimeComponent[];
  links: RuntimeLink[];
}

export interface RuntimeSystem extends System {
  components: RuntimeComponent[];
  links: RuntimeLink[];
}

export function load(filePath: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  const system = parseYaml(readFileSync(filePath, "utf8")) as System;
  const runtime = structuredClone(system) as RuntimeSystem;

  enhanceComponents(runtime, null);
  computeSizes(runtime);

  const errors = validate(system, runtime);

  return { system: runtime, errors };
}

function enhanceComponents(
  system: RuntimeSystem | RuntimeSubsystem,
  parentComponent: RuntimeComponent | null,
): void {
  system.components.forEach((component, index) => {
    // Set array position in the system.
    component.arrayPosition = index;

    // Set the parent system.
    component.parentSystem = system;

    // Set the parent component.
    if (parentComponent) {
      component.parentComponent = parentComponent;
    }

    // Enhance the components recursively.
    if (component.system) {
      enhanceComponents(component.system as RuntimeSubsystem, component);
    }
  });
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
function computeSizes(system: RuntimeSubsystem): void {
  for (const component of system.components) {
    let linksCount = system.links.filter(
      (link) =>
        link.componentAName === component.name ||
        link.componentBName === component.name,
    ).length;

    if (component.parentSystem) {
      linksCount += component.parentSystem.links.filter(
        (link) => link.subComponentBName === component.name,
      ).length;
    }

    if (linksCount <= 4) {
      component.size = {
        width: 3,
        height: 3,
      };
    } else {
      component.size = {
        width: 3 + ((linksCount - 4) % 2),
        height: 3,
      };
    }

    if (component.system) {
      computeSizes(component.system as RuntimeSubsystem);
    }
  }
}
