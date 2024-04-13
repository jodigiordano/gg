import { load as parseYaml } from "js-yaml";
import { Component, Link, System, Subsystem, Flow } from "./specification";
import { validate, ValidationError } from "./validations";

export const RuntimeLimits = {
  MaxSystemWidth: 64,
  MaxSystemHeight: 64,
};

export interface RuntimeComponentSize {
  width: number;
  height: number;
}

export interface RuntimePort {
  x: number;
  y: number;
}

export interface RuntimeComponent extends Component {
  index: number;
  size: RuntimeComponentSize;
  position: { x: number; y: number };
  parentComponent?: RuntimeComponent;
  parentSystem?: RuntimeSubsystem;
  ports: RuntimePort[];
  system?: RuntimeSubsystem;
}

export interface RuntimeLink extends Link {
  index: number;
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
  flows: RuntimeFlow[];
}

export interface RuntimeFlow extends Flow {}

export function loadYaml(yaml: string): {
  system: RuntimeSystem;
  errors: ValidationError[];
} {
  const system = parseYaml(yaml) as System;
  const runtime = structuredClone(system) as RuntimeSystem;

  setDefaultValues(runtime, null);
  enhanceComponents(runtime, null);
  computePositions(runtime);
  computeSizes(runtime);

  const errors = validate(system, runtime);

  return { system: runtime, errors };
}

function setDefaultValues(
  system: RuntimeSystem | RuntimeSubsystem,
  parentComponent: RuntimeComponent | null,
): void {
  system.components ??= [];
  system.links ??= [];

  if (!parentComponent) {
    (system as RuntimeSystem).flows ??= [];
  }

  system.components.forEach(component => {
    if (component.system) {
      setDefaultValues(component.system, component);
    }
  });
}

function enhanceComponents(
  system: RuntimeSystem | RuntimeSubsystem,
  parentComponent: RuntimeComponent | null,
): void {
  system.components.forEach((component, index) => {
    // Set array position in the system.
    component.index = index;

    // Set the parent system.
    component.parentSystem = system;

    // Set the parent component.
    if (parentComponent) {
      component.parentComponent = parentComponent;
    }

    // Enhance recursively.
    if (component.system) {
      enhanceComponents(component.system, component);
    }
  });
}

function computePositions(system: RuntimeSystem | RuntimeSubsystem): void {
  let farRight = 0;

  for (const component of system.components) {
    if (component.position) {
      farRight = Math.max(farRight, component.position.x);
    } else {
      component.position = {
        x: farRight + 10,
        y: 0,
      };

      farRight = component.position.x;
    }

    if (component.system) {
      computePositions(component.system);
    }
  }
};

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
  for (const component of system.components) {
    let linksCount = system.links.filter(
      link =>
        link.componentAName === component.name ||
        link.componentBName === component.name,
    ).length;

    if (component.parentSystem) {
      linksCount += component.parentSystem.links.filter(
        link => link.subComponentBName === component.name,
      ).length;
    }

    if (linksCount <= 4) {
      component.size = {
        width: 3,
        height: 3,
      };

      component.ports = [
        { x: component.position.x + 1, y: component.position.y - 1 },
        {
          x: component.position.x + component.size.width,
          y: component.position.y + 1,
        },
        {
          x: component.position.x + 1,
          y: component.position.y + component.size.height,
        },
        { x: component.position.x - 1, y: component.position.y + 1 },
      ];
    } else {
      component.size = {
        width: 3 + ((linksCount - 4) % 2),
        height: 3,
      };

      component.ports = [
        { x: component.position.x - 1, y: component.position.y + 1 },
        {
          x: component.position.x + component.size.width,
          y: component.position.y + 1,
        },
      ];

      for (
        let x = component.position.x + 1;
        x < component.position.x + component.size.width;
        x += 2
      ) {
        component.ports.push({ x, y: component.position.y - 1 });
        component.ports.push({
          x,
          y: component.position.y + component.size.height,
        });
      }
    }

    if (component.system) {
      computeSizes(component.system);
    }
  }
}
