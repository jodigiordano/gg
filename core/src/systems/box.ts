import { RuntimeSubsystem, RuntimeLink, RuntimeSize } from "../runtime.js";

const SystemMinSize: RuntimeSize = {
  width: 5,
  height: 3,
};

export function computeTitleMargin(system: RuntimeSubsystem): void {
  system.titleMargin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: system.systems.length && system.titleSize.height > 0 ? 1 : 0,
  };
}

export function computePadding(system: RuntimeSubsystem): void {
  system.padding = {
    left: 1,
    right: 1,
    top: system.systems.length && system.titleSize.height > 0 ? 0 : 1,
    bottom: 1,
  };
}

export function computeMargin(system: RuntimeSubsystem): void {
  if (system.parent?.type === "list") {
    system.margin = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
  } else {
    system.margin = {
      left: 1,
      right: 1,
      top: 1,
      bottom: 1,
    };
  }
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

  // Blackbox.
  if (!system.systems.length) {
    const linksCount = links.filter(
      link => link.a === system.id || link.b === system.id,
    ).length;

    const linksWidth = Math.floor(linksCount / 2);

    system.size = {
      width: Math.max(
        titleWidth + system.padding.left + system.padding.right,
        linksWidth,
        SystemMinSize.width,
      ),
      height: Math.max(
        titleHeight + system.padding.top + system.padding.bottom,
        SystemMinSize.height,
      ),
    };
  } /* Whitebox */ else {
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
}
