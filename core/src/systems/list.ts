import { RuntimeSubsystem, RuntimeLink, RuntimeSize } from "../runtime.js";

const SystemMinSize: RuntimeSize = {
  width: 7,
  height: 3,
};

export function computeTitleMargin(system: RuntimeSubsystem): void {
  system.titleMargin = {
    left: system.titleSize.height > 0 ? 1 : 0,
    right: system.titleSize.height > 0 ? 1 : 0,
    top: 0,
    bottom: 1,
  };
}

export function computePadding(system: RuntimeSubsystem): void {
  system.padding = {
    left: 0,
    right: 0,
    top: system.systems.length && system.titleSize.height > 0 ? 0 : 1,
    bottom: 0,
  };
}

export function computeMargin(system: RuntimeSubsystem): void {
  system.margin = {
    left: 1,
    right: 1,
    top: 1,
    bottom: 1,
  };
}

export function computeSize(
  system: RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  const titleWidth =
    system.titleSize.width + system.titleMargin.left + system.titleMargin.right;

  const titleHeight =
    system.titleSize.height +
    system.titleMargin.top +
    system.titleMargin.bottom;

  // Empty list.
  if (!system.systems.length) {
    const linksCount = links.filter(
      link => link.a === system.id || link.b === system.id,
    ).length;

    const linksWidth = Math.floor(linksCount / 2);

    system.size = {
      width: Math.max(titleWidth, linksWidth, SystemMinSize.width),
      height: Math.max(titleHeight, SystemMinSize.height),
    };
  } /* Non-empty list */ else {
    let maxWidth = 0;
    let maxHeight = 0;

    for (const subsystem of system.systems) {
      const width = subsystem.specification.position.x + subsystem.size.width;
      const height = subsystem.specification.position.y + subsystem.size.height;

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
      width: Math.max(
        maxWidth + system.padding.left + system.padding.right,
        titleWidth + system.padding.left + system.padding.right,
        SystemMinSize.width,
      ),
      height: Math.max(
        maxHeight + system.padding.top + system.padding.bottom + titleHeight,
        SystemMinSize.height,
      ),
    };
  }

  // The width of sub-systems drives the width of the container...
  // ... but the width of the container may also drive the width of its
  // children. For example, the list may have a long title.
  for (const subsystem of system.systems) {
    // TODO: add a "set width from parent" function that can be called recursively.
    if (subsystem.size.width < system.size.width) {
      subsystem.size.width = system.size.width;
    }
  }
}
