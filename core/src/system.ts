import { RuntimeSystem, RuntimeSubsystem, RuntimeLink } from "./runtime.js";
import {
  TitlePadding,
  TitleCharsPerSquare,
  PaddingWhiteBox,
  SystemMinSize,
  TitleMaxLineLength,
  TitleMaxLines,
} from "./consts.js";
import { Subsystem } from "./specification.js";

export function initSystem(
  system: RuntimeSubsystem,
  parent: RuntimeSystem | RuntimeSubsystem,
  specification: Subsystem,
  parentIndex: number,
  depth: number,
): void {
  // Initialize sub-systems.
  system.systems ??= [];

  // Set the specification.
  system.specification = specification;

  // Set array position in the parent.
  system.index = parentIndex;

  // Set the parent system.
  system.parent = parent;

  // Set the title, if necessary.
  system.title = (system.title ?? system.id)
    .split("\\n")
    .flatMap(line => {
      const chunks: string[] = [];

      for (let i = 0; i < line.length; i += TitleMaxLineLength - 1) {
        chunks.push(line.substring(i, i + TitleMaxLineLength - 1));
      }

      return chunks;
    })
    .slice(0, TitleMaxLines)
    .join("\\n");

  // Set hide systems default value.
  system.hideSystems ??= false;

  // Set the title size.
  const titleLengths = system.title.split("\\n").map(line => line.length);

  system.titleSize = {
    width: Math.ceil(Math.max(...titleLengths) / TitleCharsPerSquare) | 0,
    height: titleLengths.length,
  };

  // Set the title position.
  system.titlePosition = {
    x: TitlePadding,
    y: TitlePadding,
  };

  // Set the depth.
  system.depth = depth;
}

export function getRootSystem(system: RuntimeSubsystem): RuntimeSystem {
  let rootSystem: RuntimeSystem = system as unknown as RuntimeSystem;

  while (rootSystem.parent) {
    rootSystem = rootSystem.parent;
  }

  return rootSystem;
}

export function getSubsystemById(
  system: RuntimeSystem | RuntimeSubsystem,
  id: string,
): RuntimeSubsystem | null {
  for (const ss of system.systems) {
    if (ss.id === id) {
      return ss;
    }

    const foundInChildren = getSubsystemById(ss, id);

    if (foundInChildren) {
      return foundInChildren;
    }
  }

  return null;
}

export function computeSystemSize(
  system: RuntimeSubsystem,
  links: RuntimeLink[],
): void {
  // Blackbox.
  if (!system.systems.length) {
    const titleWidth = system.titleSize.width + 2 * TitlePadding;
    const titleHeight = system.titleSize.height + 2 * TitlePadding;

    const linksCount = links.filter(
      link => link.a === system.id || link.b === system.id,
    ).length;

    const linksWidth = Math.floor(linksCount / 2);

    system.size = {
      width: Math.max(titleWidth, linksWidth, SystemMinSize.width),
      height: Math.max(titleHeight, SystemMinSize.height),
    };

    return;
  }

  // Whitebox
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
    width: maxWidth + PaddingWhiteBox * 2,
    height: maxHeight + system.titleSize.height + PaddingWhiteBox * 2,
  };
}
