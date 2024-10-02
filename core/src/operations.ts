import {
  RuntimeSystem,
  RuntimeSubsystem,
  RuntimeLink,
  RuntimePosition,
} from "./runtime.js";
import { isSubsystemOf } from "./helpers.js";
import {
  Link,
  Subsystem,
  PathPattern,
  PathEndingPattern,
  TextFont,
  TextAlign,
  SubsystemType,
} from "./specification.js";
import { computeSystemSize, getRootSystem, initSystem } from "./system.js";

/*
 * Insert a subsystem in the given parent system.
 * The resulting system is not validated and may be invalid.
 */
export function addSubsystem(
  parent: RuntimeSystem | RuntimeSubsystem,
  type: SubsystemType,
  x: number,
  y: number,
  title: string,
): RuntimeSubsystem {
  const newSpecSystem: Subsystem = {
    id: generateUniqueId(),
    type,
    position: {
      x: parent.type === "list" ? 0 : x,
      y,
    },
    title,
  };

  parent.specification.systems ??= [];
  parent.specification.systems.push(newSpecSystem);

  const newRuntimeSystem = structuredClone(newSpecSystem) as RuntimeSubsystem;

  parent.systems.push(newRuntimeSystem);

  initSystem(
    newRuntimeSystem,
    parent,
    newSpecSystem,
    parent.systems.length - 1,
    parent.depth + 1,
  );

  const rootSystem = getRootSystem(parent as RuntimeSubsystem);

  computeSystemSize(newRuntimeSystem, rootSystem.links);
  moveSystems([newRuntimeSystem], 0, 0);

  return newRuntimeSystem;
}

/*
 * Remove subsystems in the given parent system.
 * This function assumes that all systems are from the same parent.
 * This function assumes at least one system.
 * The resulting system is not validated and may be invalid.
 */
export function removeSubsystems(subsystems: RuntimeSubsystem[]): void {
  const parent = subsystems[0]!.parent!;
  const siblingsSpec = parent.specification.systems!;
  const siblings = parent.systems;

  for (let i = siblingsSpec.length - 1; i >= 0; i--) {
    if (subsystems.some(ss => ss.id === siblingsSpec[i]!.id)) {
      siblingsSpec.splice(i, 1);
      siblings.splice(i, 1);
      continue;
    }
  }

  const rootSystem = getRootSystem(subsystems[0]!);

  // Remove all links of the systems and its subsystems.
  const toVisit = [...subsystems];

  while (toVisit.length) {
    const ss = toVisit.pop()!;

    toVisit.push(...ss.systems);

    let linkReadIndex = 0;
    let linkWriteIndex = 0;

    while (linkReadIndex < rootSystem.links.length) {
      const link = rootSystem.specification.links![linkReadIndex]!;

      if (link.a !== ss.id && link.b !== ss.id) {
        rootSystem.specification.links![linkWriteIndex] = link;

        linkWriteIndex++;
      }

      linkReadIndex++;
    }

    rootSystem.links.length = linkWriteIndex;

    if (rootSystem.specification.links) {
      rootSystem.specification.links.length = linkWriteIndex;
    }
  }

  // By removing systems, their siblings may need to be moved & resized.
  if (siblings.length) {
    moveSystems([...siblings], 0, 0);
  } else if (parent.id) {
    moveSystems([parent], 0, 0);
  }
}

export function setSubsystemTitle(
  subsystem: RuntimeSubsystem,
  newTitle: string,
  font: TextFont,
  align: TextAlign,
  width: number,
  height: number,
): void {
  subsystem.specification.title = newTitle;
  subsystem.specification.titleFont = font;
  subsystem.specification.titleAlign = align;
  subsystem.specification.titleSize = { width, height };

  subsystem.title = newTitle;
  subsystem.titleFont = font;
  subsystem.titleAlign = align;
  subsystem.titleSize = { width, height };

  const rootSystem = getRootSystem(subsystem);

  initSystem(
    subsystem,
    subsystem.parent!,
    subsystem.specification,
    subsystem.index,
    subsystem.depth,
  );

  computeSystemSize(subsystem, rootSystem.links);
  moveSystems([subsystem], 0, 0);
}

/*
 * Add a link in the given system.
 * The resulting system is not validated and may be invalid.
 */
export function addLink(
  system: RuntimeSystem,
  aId: string,
  bId: string,
  options: {
    title?: string;
    titleBackgroundColor?: string;
    titleFont?: TextFont;
    titleAlign?: TextAlign;
    backgroundColor?: string;
    startPattern?: PathEndingPattern;
    middlePattern?: PathPattern;
    endPattern?: PathEndingPattern;
  } = {},
): Link {
  const newLink: Link = {
    a: aId,
    b: bId,
  };

  if (options.title) {
    newLink.title = options.title;
  }

  if (options.titleBackgroundColor) {
    newLink.titleBackgroundColor = options.titleBackgroundColor;
  }

  if (options.titleFont) {
    newLink.titleFont = options.titleFont;
  }

  if (options.titleAlign) {
    newLink.titleAlign = options.titleAlign;
  }

  if (options.backgroundColor) {
    newLink.backgroundColor = options.backgroundColor;
  }

  if (options.startPattern) {
    newLink.startPattern = options.startPattern;
  }

  if (options.middlePattern) {
    newLink.middlePattern = options.middlePattern;
  }

  if (options.endPattern) {
    newLink.endPattern = options.endPattern;
  }

  system.specification.links ??= [];
  system.specification.links.push(structuredClone(newLink));

  return newLink;
}

/*
 * Move a link in the given system.
 * The resulting system is not validated and may be invalid.
 */
export function moveLink(
  link: RuntimeLink,
  idToReplace: string,
  idToReplaceWith: string,
): void {
  const rootSystem = getRootSystem(link.systemA);

  const aId = link.a === idToReplace ? idToReplaceWith : link.a;
  const bId = link.b === idToReplace ? idToReplaceWith : link.b;

  const options: Record<string, unknown> = {
    title: link.title,
    titleFont: link.titleFont,
    titleAlign: link.titleAlign,
    startPattern: link.startPattern,
    middlePattern: link.middlePattern,
    endPattern: link.endPattern,
  };

  if (link.titleBackgroundColor) {
    options["titleBackgroundColor"] = link.titleBackgroundColor;
  }

  if (link.backgroundColor) {
    options["backgroundColor"] = link.backgroundColor;
  }

  addLink(rootSystem, aId, bId, options);

  removeLink(rootSystem, link);
}

/*
 * Remove a link in the given system.
 * The resulting system is not validated and may be invalid.
 */
export function removeLink(rootSystem: RuntimeSystem, link: RuntimeLink): void {
  rootSystem.specification.links!.splice(link.index, 1);
}

export function setLinkTitle(
  link: RuntimeLink,
  newTitle: string,
  font: TextFont,
  align: TextAlign,
  width: number,
  height: number,
): void {
  if (newTitle.length) {
    link.specification.title = newTitle;
    link.specification.titleFont = font;
    link.specification.titleAlign = align;
    link.specification.titleSize = { width, height };
  } else {
    delete link.specification.title;
  }

  link.title = newTitle;
}

/*
 * Duplicate many systems of the same parent.
 * This function assumes that all systems are from the same parent.
 * This function assumes at least one system.
 * The resulting system is not validated and may be invalid.
 *
 * TODO: refactor into a "mergeSystem" function that takes a RuntimeSystem
 * to merge into a RuntimeSystem | RuntimeSubsystem.
 */
export function duplicateSystems(
  subsystems: RuntimeSubsystem[],
  parent: RuntimeSystem | RuntimeSubsystem,
  positions: RuntimePosition[],
  additionalLinks: RuntimeLink[],
): void {
  const duplicatedIds: Record<string, string> = {};

  const toMove: RuntimeSubsystem[] = [];

  for (const [index, subsystem] of subsystems.entries()) {
    // Duplicate the system.
    const duplicatedSpecSystem = structuredClone(subsystem.specification);

    duplicatedSpecSystem.id = generateUniqueId();
    duplicatedSpecSystem.position = positions[index]!;

    if (parent.type === "list") {
      duplicatedSpecSystem.position.x = 0;
    }

    duplicatedIds[subsystem.id] = duplicatedSpecSystem.id;

    // Generate unique ids for sub-systems.
    const toVisit = [...(duplicatedSpecSystem.systems ?? [])];

    while (toVisit.length) {
      const ss = toVisit.pop()!;

      if (ss.systems) {
        toVisit.push(...ss.systems);
      }

      const newId = generateUniqueId();

      duplicatedIds[ss.id] = newId;

      ss.id = newId;
    }

    // Add the system to the parent.
    parent.specification.systems ??= [];
    parent.specification.systems.push(duplicatedSpecSystem);

    // Duplicate the runtime system.
    const duplicatedRuntimeSystem = structuredClone(
      duplicatedSpecSystem,
    ) as RuntimeSubsystem;

    duplicatedRuntimeSystem.size = structuredClone(subsystem.size);

    // Add the runtime system to the parent.
    parent.systems.push(duplicatedRuntimeSystem);

    // Initialize the runtime system.
    initSystem(
      duplicatedRuntimeSystem,
      parent,
      duplicatedSpecSystem,
      parent.systems.length - 1,
      parent.depth + 1,
    );

    toMove.push(duplicatedRuntimeSystem);
  }

  // Find the root system.
  const rootSystem = getRootSystem(parent as RuntimeSubsystem);

  // Duplicate links.
  const links = rootSystem.specification.links ?? [];

  const linksToDuplicate = links
    .filter(link => duplicatedIds[link.a] && duplicatedIds[link.b])
    .concat(
      additionalLinks
        .filter(link => !links.some(l => l.a === link.a && l.b === link.b))
        .map(link => link.specification),
    );

  for (const link of linksToDuplicate) {
    const duplicatedLink = structuredClone(link);

    duplicatedLink.a = duplicatedIds[link.a]!;
    duplicatedLink.b = duplicatedIds[link.b]!;

    links.push(duplicatedLink);
  }

  moveSystems(toMove, 0, 0);
}

/*
 * Move many systems of the same parent into another parent.
 * This function assumes that all systems are from the same parent.
 * This function assumes at least one system.
 * The resulting system is not validated and may be invalid.
 */
export function moveSubsystemsToParent(
  subsystems: RuntimeSubsystem[],
  parent: RuntimeSystem | RuntimeSubsystem,
  positions: RuntimePosition[],
): void {
  // Remove subsystems from previous parent.
  const previousParent = subsystems[0]!.parent!;

  for (let i = previousParent.systems.length - 1; i >= 0; i--) {
    if (subsystems.some(ss => ss.id === previousParent.systems[i]!.id)) {
      previousParent.systems.splice(i, 1);
      previousParent.specification.systems?.splice(i, 1);
    }
  }

  // Add subsystems to new parent.
  parent.specification.systems ??= [];

  for (const [index, subsystem] of subsystems.entries()) {
    parent.specification.systems!.push(subsystem.specification);

    subsystem.specification.position.x = positions[index]!.x;
    subsystem.specification.position.y = positions[index]!.y;

    if (parent.type === "list") {
      subsystem.specification.position.x = 0;
    }

    parent.systems.push(subsystem);
  }

  // Find the root system.
  const rootSystem = getRootSystem(subsystems[0]!);

  // Move links of the subsystem.
  const speclinks = rootSystem.specification.links ?? [];
  const links = rootSystem.links ?? [];

  // Remove self-referenced links.
  // Happens when there is a link between the new parent and the subsystem.
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i]!;

    if (
      link.a === link.b ||
      isSubsystemOf(link.systemA, link.systemB) ||
      isSubsystemOf(link.systemB, link.systemA)
    ) {
      links.splice(i, 1);
      speclinks.splice(i, 1);
    }
  }

  for (const subsystem of subsystems) {
    initSystem(
      subsystem,
      parent,
      subsystem.specification,
      parent.systems.length - 1,
      parent.depth + 1,
    );
  }

  // By removing systems from a parent,
  // the siblings of that parent may need to be moved & resized.
  if (previousParent.systems.length) {
    moveSystems([...previousParent.systems], 0, 0);
  } else if (previousParent.id) {
    moveSystems([previousParent], 0, 0);
  }

  moveSystems(subsystems, 0, 0);
}

/*
 * Move many systems of the same parent.
 * This function assumes that all systems are from the same parent.
 * This function assumes at least one system.
 * The resulting system is not validated and may be invalid.
 */
export function moveSystems(
  systems: RuntimeSubsystem[],
  deltaX: number,
  deltaY: number,
): void {
  // Move the systems.
  for (const system of systems) {
    const position = system.specification.position;

    position.x += deltaX;
    position.y += deltaY;
  }

  // Create a pseudo-system that encompass all moved systems.
  const pseudoSystem = createPseudoSystem(systems);

  const centerSS = {
    x: pseudoSystem.position.x + pseudoSystem.size.width / 2,
    y: pseudoSystem.position.y + pseudoSystem.size.height / 2,
  };

  // Retrieve sibling subsystems.
  // Replace moved systems in the siblings collection with the pseudo-system.
  const parent = systems[0]!.parent;
  const allSubsystems = parent?.systems ?? [];
  const subsystemsInCollision = allSubsystems.filter(
    ss => !systems.some(s => s.id === ss.id),
  );
  subsystemsInCollision.push(pseudoSystem);

  // In a list:
  //
  // - All subsystems are at position X 0.
  // - There is no vertical space between subsystems.
  if (parent?.type === "list") {
    let nextY = 0;

    for (const subsystem of allSubsystems.sort(
      (a, b) => a.specification.position.y - b.specification.position.y,
    )) {
      subsystem.specification.position.x = 0;
      subsystem.specification.position.y = nextY;
      nextY += subsystem.size.height;
    }
  }

  // Resolve collisions.
  let iterations = 0;
  const displacers: Record<string, string[]> = {};
  const displacedThisIteration: string[] = [];

  do {
    displacedThisIteration.length = 0;
    iterations += 1;

    for (const ssACandidate of subsystemsInCollision) {
      for (const ssBCandidate of subsystemsInCollision) {
        if (
          displacedThisIteration.includes(
            [ssACandidate.id, ssBCandidate.id].join("."),
          ) ||
          ssACandidate.id === ssBCandidate.id
        ) {
          continue;
        }

        // Find which subsystem displaces and
        // which subsystem is being displaced.
        //
        // It is important that the order is consistent between iterations.
        // So if subsystem A displaces subsystem B on iteration 0,
        // it is important that A still displaces B on iteration 1.
        //
        // To accomplish this, we apply this rule: the subsystem which
        // displaces is always the one nearest (center to center) to the
        // subsystem being moved (i.e. the first parameter of this function).
        //
        // Special case: the subsystem being moved is always displacing.
        let ssA: RuntimeSubsystem;
        let ssB: RuntimeSubsystem;

        if (displacers[ssACandidate.id]?.includes(ssBCandidate.id)) {
          ssA = ssACandidate;
          ssB = ssBCandidate;
        } else if (displacers[ssBCandidate.id]?.includes(ssACandidate.id)) {
          ssA = ssBCandidate;
          ssB = ssACandidate;
        } else {
          const ssACandidateCenterX =
            ssACandidate.specification.position.x + ssACandidate.size.width / 2;

          const ssaCandidateCenterY =
            ssACandidate.specification.position.y +
            ssACandidate.size.height / 2;

          const ssACandidateDistance = Math.sqrt(
            Math.pow(ssACandidateCenterX - centerSS.x, 2) +
              Math.pow(ssaCandidateCenterY - centerSS.y, 2),
          );

          const ssBCandidateCenterX =
            ssBCandidate.specification.position.x + ssBCandidate.size.width / 2;

          const ssBCandidateCenterY =
            ssBCandidate.specification.position.y +
            ssBCandidate.size.height / 2;

          const ssBCandidateDistance = Math.sqrt(
            Math.pow(ssBCandidateCenterX - centerSS.x, 2) +
              Math.pow(ssBCandidateCenterY - centerSS.y, 2),
          );

          // Subsystem displacing.
          ssA =
            ssACandidate.id === pseudoSystem.id ||
            ssACandidateDistance < ssBCandidateDistance
              ? ssACandidate
              : ssBCandidate;

          // Subsystem being displaced.
          ssB = ssA.id === ssACandidate.id ? ssBCandidate : ssACandidate;

          displacers[ssA.id] ??= [];
          displacers[ssA.id]!.push(ssB.id);
        }

        const aPositionX1 = ssA.specification.position.x - ssA.margin.left / 2;
        const aPositionX2 =
          ssA.specification.position.x + ssA.size.width + ssA.margin.right / 2;
        const aPositionY1 = ssA.specification.position.y - ssA.margin.top / 2;
        const aPositionY2 =
          ssA.specification.position.y +
          ssA.size.height +
          ssA.margin.bottom / 2;

        const bPositionX1 = ssB.specification.position.x - ssB.margin.left / 2;
        const bPositionX2 =
          ssB.specification.position.x + ssB.size.width + ssB.margin.right / 2;
        const bPositionY1 = ssB.specification.position.y - ssB.margin.top / 2;
        const bPositionY2 =
          ssB.specification.position.y +
          ssB.size.height +
          ssB.margin.bottom / 2;

        // Calculate the area of intersection,
        // which is a rectangle [0, 0, X, Y].
        const overlapX = Math.max(
          0,
          Math.min(aPositionX2, bPositionX2) -
            Math.max(aPositionX1, bPositionX1),
        );

        const overlapY = Math.max(
          0,
          Math.min(aPositionY2, bPositionY2) -
            Math.max(aPositionY1, bPositionY1),
        );

        // No overlap.
        if (overlapX === 0 || overlapY === 0) {
          continue;
        }

        const aCenterX = (aPositionX1 + aPositionX2) / 2;
        const aCenterY = (aPositionY1 + aPositionY2) / 2;

        let bCenterX = (bPositionX1 + bPositionX2) / 2;
        const bCenterY = (bPositionY1 + bPositionY2) / 2;

        if (aCenterX === bCenterX && aCenterY === bCenterY) {
          bCenterX += 1;
        }

        const centerToCenterMagnitude = Math.sqrt(
          Math.pow(bCenterX - aCenterX, 2) + Math.pow(bCenterY - aCenterY, 2),
        );

        const centerToCenterUnitVectorX =
          (bCenterX - aCenterX) / centerToCenterMagnitude;

        const centerToCenterUnitVectorY =
          (bCenterY - aCenterY) / centerToCenterMagnitude;

        const displacementX =
          centerToCenterUnitVectorX >= 0
            ? Math.ceil(centerToCenterUnitVectorX) | 0
            : Math.floor(centerToCenterUnitVectorX) | 0;

        const displacementY =
          centerToCenterUnitVectorY >= 0
            ? Math.ceil(centerToCenterUnitVectorY) | 0
            : Math.floor(centerToCenterUnitVectorY) | 0;

        console.debug(
          ssA.id,
          "collides",
          overlapX,
          overlapY,
          "with",
          ssB.id,
          " => ",
          "move",
          ssB.id,
          displacementX,
          displacementY,
        );

        if (
          Math.abs(centerToCenterUnitVectorX) >=
          Math.abs(centerToCenterUnitVectorY)
        ) {
          ssB.specification.position.x += displacementX;
        } else {
          ssB.specification.position.y += displacementY;
        }

        displacedThisIteration.push([ssA.id, ssB.id].join("."));

        displacedThisIteration.push([ssB.id, ssA.id].join("."));
      }
    }
  } while (displacedThisIteration.length && iterations < 200);

  console.debug("iterations to resolve collisions", iterations);

  for (const system of allSubsystems) {
    const ssPosition = system.specification.position;

    // For a subsystem inside a parent subsystem,
    // a negative X or Y is not possible, as a subsystem inside another
    // subsystem always have X >= 0 and Y >= 0.
    //
    // Therefore, the strategy here is to recursively apply the
    // negative delta to the parent subsystems.
    //
    // For example, if we have:
    //
    //   root
    //     subsystemA, x: 3, y: 2
    //       subsystemB: x: 0, y: 1
    //         subsystemC: x: -4, y: -1
    //
    //  We end up with:
    //
    //   root
    //     subsystemA, x: -1, y: 2     <- absorb x: -4 from subsystemC.
    //       subsystemB: x: 0, y: 0    <- absorb y: -1 from subsystemC.
    //         subsystemC: x: 0, y: 0
    if ((ssPosition.x < 0 || ssPosition.y < 0) && system.depth > 1) {
      let parent = system.parent as RuntimeSubsystem;
      let displacementX = ssPosition.x < 0 ? Math.abs(ssPosition.x) : 0;
      let displacementY = ssPosition.y < 0 ? Math.abs(ssPosition.y) : 0;

      console.debug(
        system.id,
        "out of bounds",
        " => displacing",
        parent.id,
        displacementX,
        displacementY,
      );

      if (ssPosition.x < 0) {
        ssPosition.x = 0;
      }

      if (ssPosition.y < 0) {
        ssPosition.y = 0;
      }

      // Sibling systems need to stay at their relative position while the
      // parent system is being moved.
      for (const siblingSystem of allSubsystems) {
        if (siblingSystem.id !== system.id) {
          const siblingPosition = siblingSystem.specification.position;

          siblingPosition.x += displacementX;
          siblingPosition.y += displacementY;
        }
      }

      for (let depth = system.depth - 1; depth > 0; depth--) {
        const parentPosition = parent.specification.position;

        parentPosition.x -= displacementX;
        parentPosition.y -= displacementY;

        displacementX = parentPosition.x < 0 ? Math.abs(parentPosition.x) : 0;
        displacementY = parentPosition.y < 0 ? Math.abs(parentPosition.y) : 0;

        if (displacementX === 0 && displacementY === 0) {
          break;
        }

        if (depth > 1 && parentPosition.x < 0) {
          parentPosition.x = 0;
        }

        if (depth > 1 && parentPosition.y < 0) {
          parentPosition.y = 0;
        }

        parent = parent!.parent as RuntimeSubsystem;
      }
    }
  }

  // Recursive traversal.
  //
  // When a subsystem is part of a parent subsystem,
  // it may make that parent subsystem grows and potentially displaces
  // other subsystems.
  if (parent && parent.id) {
    const rootSystem = getRootSystem(pseudoSystem);

    computeSystemSize(parent, rootSystem.links);
    moveSystems([parent], 0, 0);
  }
}

function createPseudoSystem(systems: RuntimeSubsystem[]): RuntimeSubsystem {
  let left = Number.MAX_SAFE_INTEGER;
  let right = -Number.MAX_SAFE_INTEGER;
  let top = Number.MAX_SAFE_INTEGER;
  let bottom = -Number.MAX_SAFE_INTEGER;

  for (const system of systems) {
    if (system.specification.position.x < left) {
      left = system.specification.position.x;
    }

    if (system.specification.position.x + system.size.width > right) {
      right = system.specification.position.x + system.size.width;
    }

    if (system.specification.position.y < top) {
      top = system.specification.position.y;
    }

    if (system.specification.position.y + system.size.height > bottom) {
      bottom = system.specification.position.y + system.size.height;
    }
  }

  // Happens when there are no subsystems.
  if (left > right) {
    left = right;
  }

  if (top > bottom) {
    top = bottom;
  }

  return {
    /* Important */
    id: "gg-pseudo-system",
    type: systems.some(ss => ss.type === "box") ? "box" : systems[0]!.type,
    padding:
      systems.find(ss => ss.type === "box")?.padding ?? systems[0]!.padding,
    margin: systems.find(ss => ss.type === "box")?.margin ?? systems[0]!.margin,
    parent: systems[0]!.parent!,
    depth: systems[0]!.depth,
    position: { x: left, y: top },
    size: { width: right - left, height: bottom - top },
    specification: {
      id: "gg-pseudo-system",
      position: {
        x: left,
        y: top,
      },
    },
    /* Irrelevant */
    title: "",
    titleMargin: { left: 0, right: 0, top: 0, bottom: 0 },
    titleSize: { width: 0, height: 0 },
    titleFont: "text",
    titleAlign: "left",
    index: -1,
    systems: [],
    links: [],
    borderPattern: "none",
  };
}

function generateUniqueId(): string {
  return (Math.random() + 1).toString(36).substring(7);
}
