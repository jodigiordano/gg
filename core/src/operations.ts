import {
  RuntimeSystem,
  RuntimeSubsystem,
  RuntimeLink,
  RuntimeFlowStep,
} from "./runtime.js";
import { SystemMargin } from "./helpers.js";
import {
  Link,
  FlowStep,
  Subsystem,
  PathPattern,
  PathEndingPattern,
  TextFont,
  TextAlign,
} from "./specification.js";
import { computeSystemSize, getRootSystem, initSystem } from "./system.js";

/*
 * Insert a subsystem in the given parent system.
 * The resulting system is not validated and may be invalid.
 */
export function addSubsystem(
  parent: RuntimeSystem | RuntimeSubsystem,
  x: number,
  y: number,
  title: string,
): void {
  const newSpecSystem: Subsystem = {
    id: (Math.random() + 1).toString(36).substring(7),
    position: { x, y },
    title,
  };

  // Add subsystem to new parent.
  const parentWasBlackbox = parent.systems.length === 0;

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

  if (parentWasBlackbox) {
    // Move links of the parent.
    for (const link of rootSystem.specification.links ?? []) {
      if (link.a === parent.id) {
        link.a = newRuntimeSystem.id;
      } else if (link.b === parent.id) {
        link.b = newRuntimeSystem.id;
      }
    }

    // Move flows of the parent.
    for (const flow of rootSystem.specification.flows ?? []) {
      for (const step of flow.steps) {
        if (step.from === parent.id) {
          step.from = newRuntimeSystem.id;
        } else if (step.to === parent.id) {
          step.to = newRuntimeSystem.id;
        }
      }
    }
  }

  computeSystemSize(newRuntimeSystem, rootSystem.links);
  moveSystem(newRuntimeSystem, 0, 0);
}

/*
 * Remove a subsystem in the given parent system.
 * The resulting system is not validated and may be invalid.
 */
export function removeSubsystem(subsystem: RuntimeSubsystem): void {
  subsystem.parent!.specification.systems?.splice(subsystem.index, 1);

  const rootSystem = getRootSystem(subsystem);

  // Remove all links of the system and its subsystems.
  const subsystems = [subsystem];

  while (subsystems.length) {
    const ss = subsystems.pop()!;

    subsystems.push(...ss.systems);

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

  // Remove flow steps.
  for (const flow of rootSystem.specification.flows ?? []) {
    let stepReadIndex = 0;
    let stepWriteIndex = 0;

    while (stepReadIndex < flow.steps.length) {
      const step = flow.steps[stepReadIndex]!;

      if (step.from !== subsystem.id && step.to !== subsystem.id) {
        flow.steps[stepWriteIndex] = step;

        stepWriteIndex++;
      }

      stepReadIndex++;
    }

    flow.steps.length = stepWriteIndex;
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
  moveSystem(subsystem, 0, 0);
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

  addLink(rootSystem, aId, bId, {
    title: link.title,
    startPattern: link.startPattern,
    middlePattern: link.middlePattern,
    endPattern: link.endPattern,
  });

  // Transfer flow steps.
  for (const flow of rootSystem.specification.flows ?? []) {
    for (const step of flow.steps) {
      const goThroughLink =
        (step.from === link.a && step.to === link.b) ||
        (step.from === link.b && step.to === link.a);

      if (goThroughLink) {
        if (step.from === idToReplace) {
          step.from = idToReplaceWith;
        }

        if (step.to === idToReplace) {
          step.to = idToReplaceWith;
        }
      }
    }
  }

  removeLink(rootSystem, link);
}

/*
 * Remove a link in the given system.
 * The resulting system is not validated and may be invalid.
 */
export function removeLink(rootSystem: RuntimeSystem, link: RuntimeLink): void {
  rootSystem.specification.links!.splice(link.index, 1);

  // Remove flow steps.
  for (const flow of rootSystem.specification.flows ?? []) {
    let stepReadIndex = 0;
    let stepWriteIndex = 0;

    while (stepReadIndex < flow.steps.length) {
      const step = flow.steps[stepReadIndex]!;

      const goThroughLink =
        (step.from === link.a && step.to === link.b) ||
        (step.from === link.b && step.to === link.a);

      if (!goThroughLink) {
        flow.steps[stepWriteIndex] = step;

        stepWriteIndex++;
      }

      stepReadIndex++;
    }

    flow.steps.length = stepWriteIndex;
  }
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

export function moveSubsystemToParent(
  subsystem: RuntimeSubsystem,
  parent: RuntimeSystem | RuntimeSubsystem,
  x: number,
  y: number,
): void {
  // Remove subsystem from previous parent.
  subsystem.parent!.specification.systems?.splice(subsystem.index, 1);
  subsystem.parent!.systems.splice(subsystem.index, 1);

  // Add subsystem to new parent.
  const parentWasBlackbox = parent.systems.length === 0;

  parent.specification.systems ??= [];
  parent.specification.systems!.push(subsystem.specification);

  subsystem.specification.position.x = x;
  subsystem.specification.position.y = y;

  parent.systems.push(subsystem);

  // Find the root system.
  const rootSystem = getRootSystem(subsystem);

  // Move links of the subsystem.
  const links = rootSystem.specification.links ?? [];

  // TODO: size calculation uses runtime links.
  // TODO Either use spec links instead or modify both spec & runtime links here.

  // Move links of the parent.
  if (parentWasBlackbox) {
    for (const link of links) {
      if (link.a === parent.id) {
        link.a = subsystem.id;
      } else if (link.b === parent.id) {
        link.b = subsystem.id;
      }
    }
  }

  // Remove self-referenced links.
  // Happens when there is a link between the new parent and the subsystem.
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i]!;

    if (link.a === link.b) {
      links.splice(i, 1);
    }
  }

  // Remove duplicated links.
  // Happens when both the new parent and the subsystem have
  // a link with another subsystem.
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i]!;

    for (let j = links.length - 1; j >= 0; j--) {
      const other = links[j]!;

      if (
        i !== j &&
        [other.a, other.b].sort().join("") === [link.a, link.b].sort().join("")
      ) {
        links.splice(i, 1);
      }
    }
  }

  // Move flows of the subsystem.
  const flows = rootSystem.specification.flows ?? [];

  if (parentWasBlackbox) {
    for (const flow of flows) {
      for (const step of flow.steps) {
        if (step.from === parent.id) {
          step.from = subsystem.id;
        } else if (step.to === parent.id) {
          step.to = subsystem.id;
        }
      }
    }
  }

  // Remove self-referenced steps.
  // Happens when there is a step between the new parent and the subsystem.
  for (const flow of flows) {
    for (let i = flow.steps.length - 1; i >= 0; i--) {
      const step = flow.steps[i]!;

      if (step.from === step.to) {
        flow.steps.splice(i, 1);
      }
    }
  }

  initSystem(
    subsystem,
    parent,
    subsystem.specification,
    parent.systems.length - 1,
    parent.depth + 1,
  );

  moveSystem(subsystem, 0, 0);
}

/*
 * Move a system.
 * The resulting system is not validated and may be invalid.
 */
export function moveSystem(
  system: RuntimeSubsystem,
  deltaX: number,
  deltaY: number,
): void {
  // Move the ss.
  const ssPosition = system.specification.position;

  ssPosition.x += deltaX;
  ssPosition.y += deltaY;

  const centerSS = {
    x: ssPosition.x + system.size.width / 2,
    y: ssPosition.y + system.size.height / 2,
  };

  // Retrieve sibling subsystems.
  const subsystems = system.parent?.systems ?? [];

  // Resolve collisions.

  let iterations = 0;
  const displacers: Record<string, string[]> = {};
  const displacedThisIteration: string[] = [];

  do {
    displacedThisIteration.length = 0;
    iterations += 1;

    for (const ssACandidate of subsystems) {
      for (const ssBCandidate of subsystems) {
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
            ssACandidate.id === system.id ||
            ssACandidateDistance < ssBCandidateDistance
              ? ssACandidate
              : ssBCandidate;

          // Subsystem being displaced.
          ssB = ssA.id === ssACandidate.id ? ssBCandidate : ssACandidate;

          displacers[ssA.id] ??= [];
          displacers[ssA.id]!.push(ssB.id);
        }

        const aPositionX1 = ssA.specification.position.x - SystemMargin;
        const aPositionX2 =
          ssA.specification.position.x + ssA.size.width + SystemMargin;
        const aPositionY1 = ssA.specification.position.y - SystemMargin;
        const aPositionY2 =
          ssA.specification.position.y + ssA.size.height + SystemMargin;

        const bPositionX1 = ssB.specification.position.x - SystemMargin;
        const bPositionX2 =
          ssB.specification.position.x + ssB.size.width + SystemMargin;
        const bPositionY1 = ssB.specification.position.y - SystemMargin;
        const bPositionY2 =
          ssB.specification.position.y + ssB.size.height + SystemMargin;

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

  for (const system of subsystems) {
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
      for (const siblingSystem of subsystems) {
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
  if (system.parent && system.parent.id) {
    const rootSystem = getRootSystem(system);

    const sizeBefore = structuredClone(system.parent.size);

    computeSystemSize(system.parent, rootSystem.links);

    // Optimization: when the parent subsystem shrinks,
    // it won't create collisions.
    if (
      system.parent.size.width > sizeBefore.width ||
      system.parent.size.height > sizeBefore.height
    ) {
      moveSystem(system.parent, 0, 0);
    }
  }
}

/*
 * Remove a flow step from the system.
 * The resulting system is not validated and may be invalid.
 */
export function removeFlowStep(
  system: RuntimeSystem,
  step: RuntimeFlowStep,
): void {
  system.specification.flows ??= [
    {
      steps: [],
    },
  ];

  system.specification.flows?.at(0)?.steps?.splice(step.index, 1);
}

/*
 * Add a flow step in the system.
 * The resulting system is not validated and may be invalid.
 */
export function addFlowStep(
  system: RuntimeSystem,
  keyframe: number,
  from: string,
  to: string,
) {
  const newStep: FlowStep = {
    keyframe,
    from,
    to,
  };

  system.specification.flows ??= [
    {
      steps: [],
    },
  ];

  system.specification.flows[0]!.steps.push(structuredClone(newStep));

  return newStep;
}
