import {
  RuntimeSystem,
  RuntimeSubsystem,
  RuntimeLink,
  RuntimePosition,
} from "./runtime.js";
import { SystemMargin } from "./consts.js";
import { Link, FlowStep } from "./specification.js";
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
  const newSpecSystem = {
    id: (Math.random() + 1).toString(36).substring(7),
    position: { x, y },
    title,
  };
  parent.specification.systems ??= [];
  parent.specification.systems.push(newSpecSystem);

  const rootSystem = getRootSystem(parent as RuntimeSubsystem);

  const newRuntimeSystem = structuredClone(newSpecSystem) as RuntimeSubsystem;

  parent.systems.push(newRuntimeSystem);

  initSystem(
    newRuntimeSystem,
    parent,
    newSpecSystem,
    parent.systems.length - 1,
    parent.depth + 1,
  );

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

  // Remove links.
  let linkReadIndex = 0;
  let linkWriteIndex = 0;

  while (linkReadIndex < rootSystem.links.length) {
    const link = rootSystem.specification.links![linkReadIndex]!;

    if (
      !link.a.startsWith(subsystem.canonicalId) &&
      !link.b.startsWith(subsystem.canonicalId)
    ) {
      rootSystem.specification.links![linkWriteIndex] = link;

      linkWriteIndex++;
    }

    linkReadIndex++;
  }

  rootSystem.links.length = linkWriteIndex;

  if (rootSystem.specification.links) {
    rootSystem.specification.links.length = linkWriteIndex;
  }

  // Remove flows.
  // TODO: instead of removing the entire flow, try to remove steps.
  let flowReadIndex = 0;
  let flowWriteIndex = 0;

  while (flowReadIndex < rootSystem.flows.length) {
    const flow = rootSystem.specification.flows![flowReadIndex]!;

    if (
      !flow.steps.some(
        (step: FlowStep) =>
          step.from.startsWith(subsystem.canonicalId) ||
          step.to.startsWith(subsystem.canonicalId),
      )
    ) {
      rootSystem.specification.flows![flowWriteIndex] = flow;

      flowWriteIndex++;
    }

    flowReadIndex++;
  }

  rootSystem.flows.length = flowWriteIndex;

  if (rootSystem.specification.flows) {
    rootSystem.specification.flows.length = flowWriteIndex;
  }
}

export function setSubsystemTitle(
  subsystem: RuntimeSubsystem,
  newTitle: string,
): void {
  subsystem.specification.title = newTitle;
  subsystem.title = newTitle;

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
  aCanonicalId: string,
  bCanonicalId: string,
): Link {
  const newLink = {
    a: aCanonicalId,
    b: bCanonicalId,
  };

  system.specification.links ??= [];
  system.specification.links.push(structuredClone(newLink));

  return newLink;
}

/*
 * Remove a link in the given system.
 * The resulting system is not validated and may be invalid.
 */
export function removeLink(system: RuntimeSystem, link: RuntimeLink): void {
  system.specification.links!.splice(link.index, 1);
}

export function moveSubsystemToParent(
  subsystem: RuntimeSubsystem,
  parent: RuntimeSystem | RuntimeSubsystem,
  x: number,
  y: number,
): void {
  subsystem.parent!.specification.systems?.splice(subsystem.index, 1);

  parent.specification.systems ??= [];
  parent.specification.systems!.push(subsystem.specification);

  // TODO: move links.
  // TODO: move flows.

  subsystem.specification.position.x = x;
  subsystem.specification.position.y = y;

  parent.systems.push(subsystem);

  const rootSystem = getRootSystem(subsystem);

  initSystem(
    subsystem,
    parent,
    subsystem.specification,
    parent.systems.length - 1,
    parent.depth + 1,
  );

  if (parent.canonicalId) {
    computeSystemSize(parent, rootSystem.links);
  }

  moveSystem(subsystem, 0, 0);
}

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

  // Retrieve sibling subsystems and
  // sort them by distance of ss, nearest first.
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
            [ssACandidate.canonicalId, ssBCandidate.canonicalId].join("."),
          ) ||
          ssACandidate.canonicalId === ssBCandidate.canonicalId
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

        if (
          displacers[ssACandidate.canonicalId]?.includes(
            ssBCandidate.canonicalId,
          )
        ) {
          ssA = ssACandidate;
          ssB = ssBCandidate;
        } else if (
          displacers[ssBCandidate.canonicalId]?.includes(
            ssACandidate.canonicalId,
          )
        ) {
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
            ssACandidate.canonicalId === system.canonicalId ||
            ssACandidateDistance < ssBCandidateDistance
              ? ssACandidate
              : ssBCandidate;

          // Subsystem being displaced.
          ssB =
            ssA.canonicalId === ssACandidate.canonicalId
              ? ssBCandidate
              : ssACandidate;

          displacers[ssA.canonicalId] ??= [];
          displacers[ssA.canonicalId]!.push(ssB.canonicalId);
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
          ssA.canonicalId,
          "collides",
          overlapX,
          overlapY,
          "with",
          ssB.canonicalId,
          " => ",
          "move",
          ssB.canonicalId,
          displacementX,
          displacementY,
        );

        // TODO: quick test. Instead of a radial displacement, try a
        // horizontal / vertical displacement.
        if (
          Math.abs(centerToCenterUnitVectorX) >=
          Math.abs(centerToCenterUnitVectorY)
        ) {
          ssB.specification.position.x += displacementX;
        } else {
          ssB.specification.position.y += displacementY;
        }

        displacedThisIteration.push(
          [ssA.canonicalId, ssB.canonicalId].join("."),
        );

        displacedThisIteration.push(
          [ssB.canonicalId, ssA.canonicalId].join("."),
        );
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
        system.canonicalId,
        "out of bounds",
        " => displacing",
        parent.canonicalId,
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
        if (siblingSystem.canonicalId !== system.canonicalId) {
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
  if (system.parent && system.parent.canonicalId) {
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
