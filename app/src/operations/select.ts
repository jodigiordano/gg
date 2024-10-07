import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSystems,
  RuntimeLink,
  moveLink,
  moveSubsystemsToParent,
  removeSubsystems,
  System,
  RuntimeSystem,
  isSubsystemOf,
  getSubsystemById,
  BorderPattern,
  TextAlign,
  TextFont,
  removeLink,
  loadJSON,
  duplicateSystems,
  removeLinkTitle,
} from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import SystemLinker from "../renderer/systemLinker.js";
import SystemSelector from "../renderer/systemSelector.js";
import MultiSystemSelector from "../renderer/multiSystemSelector.js";
import * as SystemBorderProperty from "../properties/systemBorder.js";
import * as LineStartProperty from "../properties/lineStart.js";
import * as LineMiddleProperty from "../properties/lineMiddle.js";
import * as LineEndProperty from "../properties/lineEnd.js";
import * as TextAlignProperty from "../properties/textAlign.js";
import * as TextFontProperty from "../properties/textFont.js";
import * as ActionsProperty from "../properties/actions.js";
import * as Paint from "../properties/actionPaint.js";

//
// Select & move multiple systems.
//

// State 1: select systems.

const multiSelectVisual = new MultiSystemSelector();
const multiMovingVisual = new MultiSystemSelector();

let multiSelectStartAt: RuntimePosition | null = null;
let multiSelectEndAt: RuntimePosition | null = null;

// State 2: move systems.

let multiPickedUpAt: RuntimePosition | null = null;

//
// Select & move one system.
//

const oneSystemSelectedVisual = new SystemSelector();
const oneSystemHoverVisual = new SystemSelector();
const oneSystemMoveVisual = new SystemSelector();

let oneSystemSelected: RuntimeSubsystem | null = null;
let oneSystemPickedUpAt: RuntimePosition | null = null;

//
// Select & move one link or select one link title.
//

const oneLinkSelected1Visual = new SystemSelector();
const oneLinkSelected2Visual = new SystemSelector();
const oneLinkHoverVisual = new SystemSelector();
const oneLinkMoveVisual = new SystemLinker();

let oneLinkSelected: RuntimeLink | null = null;
let oneLinkTitleSelected: RuntimeLink | null = null;
let oneLinkSelectedBeforeSystem: RuntimeSubsystem | null = null;
let oneLinkSelectedAfterSystem: RuntimeSubsystem | null = null;

//
// Move into a container.
//

const parentSystemSelectVisual = new SystemSelector();

//
// Duplicate a system on paste.
//

let systemToDuplicate: RuntimeSystem | null = null;

//
// Handlers.
//

function isChildOf(a: RuntimeSubsystem, bId: string): boolean {
  return a.systems.some(ss => ss.id === bId || isChildOf(ss, bId));
}

function isSystemPadding(
  subsystem: RuntimeSubsystem,
  x: number,
  y: number,
): boolean {
  const insideSystem =
    x >= subsystem.position.x + 1 &&
    x <= subsystem.position.x + subsystem.size.width - 2 &&
    y >= subsystem.position.y + 1 &&
    y <= subsystem.position.y + subsystem.size.height - 2;

  return !insideSystem;
}

function onPointerMove(state: State) {
  oneSystemSelectedVisual.visible = false;
  oneSystemHoverVisual.visible = false;
  oneSystemMoveVisual.visible = false;
  oneLinkSelected1Visual.visible = false;
  oneLinkSelected2Visual.visible = false;
  oneLinkHoverVisual.visible = false;
  oneLinkMoveVisual.visible = false;
  multiSelectVisual.visible = true;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = true;
  multiMovingVisual.visible = true;
  multiMovingVisual.lassoVisible = false;
  multiMovingVisual.selectedVisible = false;
  parentSystemSelectVisual.visible = false;

  //
  // Move multiple systems - Stage 2.1
  //
  if (multiPickedUpAt) {
    // Do not show the selected systems when they are being duplicated.
    if (systemToDuplicate) {
      multiSelectVisual.visible = false;
    }

    // Show the moving systems.
    multiMovingVisual.selectedVisible = true;

    const deltaX = state.x - multiPickedUpAt.x;
    const deltaY = state.y - multiPickedUpAt.y;

    for (const subsystem of multiSelectVisual.selected) {
      multiMovingVisual.setSystemPosition(subsystem, { x: deltaX, y: deltaY });
    }

    // Show hovering another system (container).
    let parent = state.simulator.getSubsystemAt(state.x, state.y);

    // The systems are hovering the perimeter of another system,
    // which is part of a list.
    if (
      parent?.parent?.type === "list" &&
      isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
    ) {
      parent = parent.parent;
    }

    if (
      // User is duplicating.
      !systemToDuplicate &&
      // User moves the ss over itself.
      ((parent?.id &&
        multiSelectVisual.selected.some(
          selected => selected.id === parent!.id,
        )) ||
        // User moves the ss inside a child ss.
        (parent?.id && isChildOf(multiSelectVisual.selected[0]!, parent.id)))
    ) {
      parent = multiSelectVisual.selected[0]!.parent as RuntimeSubsystem;
    }

    if (parent?.id) {
      parentSystemSelectVisual.setPosition(parent, { x: 0, y: 0 });
      parentSystemSelectVisual.visible = true;
    }

    return;
  }

  //
  // Move multiple systems - Stage 1.
  //
  if (multiSelectStartAt) {
    multiSelectVisual.lassoVisible = true;

    multiSelectEndAt = { x: state.x, y: state.y };

    multiSelectVisual.setLassoPosition(
      multiSelectStartAt.x,
      multiSelectStartAt.y,
      multiSelectEndAt.x,
      multiSelectEndAt.y,
    );

    multiSelectVisual.setSelectedFromLasso(state.simulator);

    multiMovingVisual.setLassoPosition(
      multiSelectStartAt.x,
      multiSelectStartAt.y,
      multiSelectEndAt.x,
      multiSelectEndAt.y,
    );

    multiMovingVisual.setSelectedFromLasso(state.simulator);

    return;
  }

  //
  // Hovering one system.
  //
  const hoveringSystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (
    /* Whitebox */
    (hoveringSystem &&
      hoveringSystem.systems.length &&
      isSystemPadding(hoveringSystem, state.x, state.y)) ||
    /* Blackbox */
    (hoveringSystem && !hoveringSystem.systems.length)
  ) {
    oneSystemHoverVisual.visible = true;
    oneSystemHoverVisual.setPosition(hoveringSystem, { x: 0, y: 0 });
  }

  //
  // Hovering one link or one link title.
  //
  if (!oneSystemPickedUpAt && !multiPickedUpAt) {
    const linkTitleToSelect = state.simulator.getLinkByTitleAt(
      state.x,
      state.y,
    );

    if (linkTitleToSelect) {
      oneLinkHoverVisual.visible = true;
      oneLinkHoverVisual.setPositionRect(
        linkTitleToSelect.titlePosition.x,
        linkTitleToSelect.titlePosition.y,
        linkTitleToSelect.titlePosition.x + linkTitleToSelect.titleSize.width,
        linkTitleToSelect.titlePosition.y + linkTitleToSelect.titleSize.height,
      );
    } else {
      const linkToSelect = state.simulator.getLinkAt(state.x, state.y);

      if (linkToSelect) {
        oneLinkHoverVisual.visible = true;
        oneLinkHoverVisual.setPositionRect(state.x, state.y, state.x, state.y);
      }
    }
  }

  //
  // Move multiple systems - Stage 2.2
  //
  if (multiSelectVisual.selected.length) {
    return;
  }

  //
  // Selecting one link title.
  //
  if (oneLinkTitleSelected) {
    oneLinkSelected1Visual.visible = true;
    oneLinkSelected1Visual.setPositionRect(
      oneLinkTitleSelected.titlePosition.x,
      oneLinkTitleSelected.titlePosition.y,
      oneLinkTitleSelected.titlePosition.x +
        oneLinkTitleSelected.titleSize.width,
      oneLinkTitleSelected.titlePosition.y +
        oneLinkTitleSelected.titleSize.height,
    );
  }

  //
  // Selecting one link.
  //
  if (oneLinkSelected) {
    const path = state.simulator.getPath(oneLinkSelected)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;
    const [endX, endY] = path.at(-1)!;

    oneLinkSelected1Visual.visible = true;
    oneLinkSelected1Visual.setPositionRect(
      startX - boundaries.translateX - 0.25,
      startY - boundaries.translateY - 0.25,
      startX - boundaries.translateX + 0.25,
      startY - boundaries.translateY + 0.25,
    );

    oneLinkSelected2Visual.visible = true;
    oneLinkSelected2Visual.setPositionRect(
      endX - boundaries.translateX - 0.25,
      endY - boundaries.translateY - 0.25,
      endX - boundaries.translateX + 0.25,
      endY - boundaries.translateY + 0.25,
    );
  }

  //
  // Moving one link.
  //
  if (oneLinkSelected && oneLinkSelectedBeforeSystem) {
    const path = state.simulator.getPath(oneLinkSelected)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] =
      oneLinkSelectedBeforeSystem.id === oneLinkSelected.b
        ? path.at(-1)!
        : path.at(0)!;

    oneLinkMoveVisual.visible = true;
    oneLinkMoveVisual.setPosition(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      state.x,
      state.y,
    );

    oneLinkSelected1Visual.visible = true;
    oneLinkSelected1Visual.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const oneLinkNewB = state.simulator.getSubsystemAt(state.x, state.y);

    if (oneLinkNewB) {
      const oneLinkA =
        oneLinkSelectedBeforeSystem.id === oneLinkSelected.a
          ? oneLinkSelected.systemB
          : oneLinkSelected.systemA;

      if (
        oneLinkNewB.id !== oneLinkSelected.a &&
        oneLinkNewB.id !== oneLinkSelected.b &&
        !isSubsystemOf(oneLinkNewB, oneLinkA) &&
        !isSubsystemOf(oneLinkA, oneLinkNewB)
      ) {
        oneSystemSelectedVisual.visible = true;
        oneSystemSelectedVisual.setPosition(oneLinkNewB, { x: 0, y: 0 });

        oneLinkSelectedAfterSystem = oneLinkNewB;
      }
    }

    return;
  }

  //
  // Selecting one system.
  //
  if (oneSystemSelected) {
    oneSystemSelectedVisual.visible = true;
    oneSystemSelectedVisual.setPosition(oneSystemSelected, { x: 0, y: 0 });
  }

  //
  // Moving one system.
  //
  if (oneSystemSelected && oneSystemPickedUpAt) {
    // Show the moving system.
    oneSystemMoveVisual.visible = true;
    oneSystemMoveVisual.setPosition(oneSystemSelected, {
      x: state.x - oneSystemPickedUpAt.x,
      y: state.y - oneSystemPickedUpAt.y,
    });

    // Show hovering another system (container).
    let parent = state.simulator.getSubsystemAt(state.x, state.y);

    // The system is hovering the perimeter of another system,
    // which is part of a list.
    if (
      parent?.parent?.type === "list" &&
      isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
    ) {
      parent = parent.parent;
    }

    if (
      // User moves the ss over itself.
      (parent?.id && oneSystemSelected.id === parent.id) ||
      // User moves the ss inside a child ss.
      (parent?.id && isChildOf(oneSystemSelected, parent.id))
    ) {
      parent = oneSystemSelected.parent as RuntimeSubsystem;
    }

    if (parent?.id) {
      parentSystemSelectVisual.setPosition(parent, { x: 0, y: 0 });
      parentSystemSelectVisual.visible = true;
    }

    return;
  }
}

function resetMultiSelection(): void {
  multiSelectVisual.reset();
  multiSelectVisual.visible = false;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = false;
  multiSelectVisual.tint = "#0de500";

  multiMovingVisual.reset();
  multiMovingVisual.visible = false;
  multiMovingVisual.lassoVisible = false;
  multiMovingVisual.selectedVisible = false;
  multiMovingVisual.tint = "#0de500";

  multiSelectStartAt = null;
  multiSelectEndAt = null;
  multiPickedUpAt = null;
}

function resetSingleSelection(): void {
  oneSystemSelectedVisual.visible = false;
  oneSystemHoverVisual.visible = false;
  oneSystemMoveVisual.visible = false;
  oneSystemSelected = null;
  oneSystemPickedUpAt = null;

  SystemBorderProperty.hide();

  oneLinkSelected1Visual.visible = false;
  oneLinkSelected2Visual.visible = false;
  oneLinkHoverVisual.visible = false;
  oneLinkMoveVisual.visible = false;
  oneLinkSelected = null;
  oneLinkTitleSelected = null;
  oneLinkSelectedBeforeSystem = null;
  oneLinkSelectedAfterSystem = null;

  LineStartProperty.hide();
  LineMiddleProperty.hide();
  LineEndProperty.hide();
  TextAlignProperty.hide();
  TextFontProperty.hide();
  ActionsProperty.hide();
}

function onModified(state: State): void {
  systemToDuplicate = null;

  // When a multi-selection is modified (ex: moved, property change, etc.),
  // reselect it.
  if (multiSelectVisual.selected.length) {
    const subsystems = multiSelectVisual.selected.map(subsystem =>
      getSubsystemById(state.simulator.getSystem(), subsystem.id),
    );

    resetSingleSelection();
    resetMultiSelection();

    multiSelectVisual.setSelectedFromSubsystems(subsystems);
    multiMovingVisual.setSelectedFromSubsystems(subsystems);

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // When a system is modified (ex: moved, property change, etc.), reselect it.
  if (oneSystemSelected) {
    const subsystem = getSubsystemById(
      state.simulator.getSystem(),
      oneSystemSelected.id,
    ) as RuntimeSubsystem;

    resetSingleSelection();
    resetMultiSelection();

    oneSystemSelected = subsystem;

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // When a link title is modified (ex: moved, property change, etc.), reselect it.
  if (oneLinkTitleSelected) {
    const link = state.simulator
      .getSystem()
      .links.find(link => link.index === oneLinkTitleSelected?.index)!;

    resetSingleSelection();
    resetMultiSelection();

    oneLinkTitleSelected = link;

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // When a link is modified (ex: moved, property change, etc.), reselect it.
  if (oneLinkSelected) {
    const link = state.simulator
      .getSystem()
      .links.find(link => link.index === oneLinkSelected?.index)!;

    resetSingleSelection();
    resetMultiSelection();

    oneLinkSelected = link;

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // Default behavior.
  onBegin(state);
}

function onBegin(state: State): void {
  resetMultiSelection();
  resetSingleSelection();

  systemToDuplicate = null;

  viewport.pause = false;
  onPointerMove(state);
}

function onBorderPatternChange(state: State, value: BorderPattern): void {
  if (multiSelectVisual.selected.length) {
    modifySpecification(() => {
      for (const subsystem of multiSelectVisual.selected) {
        subsystem.specification.borderPattern = value;
      }
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneSystemSelected) {
    modifySpecification(() => {
      oneSystemSelected!.specification.borderPattern = value;
    }).then(() => {
      onModified(state);
      tick();
    });
  }
}

function onTextAlignChange(state: State, value: TextAlign): void {
  if (multiSelectVisual.selected.length) {
    modifySpecification(() => {
      for (const subsystem of multiSelectVisual.selected) {
        subsystem.specification.titleAlign = value;
      }
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneSystemSelected) {
    modifySpecification(() => {
      oneSystemSelected!.specification.titleAlign = value;
    }).then(() => {
      onModified(state);
      tick();
    });
  }
}

function onTextFontChange(state: State, value: TextFont): void {
  if (multiSelectVisual.selected.length) {
    modifySpecification(() => {
      for (const subsystem of multiSelectVisual.selected) {
        subsystem.specification.titleFont = value;
      }
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneSystemSelected) {
    modifySpecification(() => {
      oneSystemSelected!.specification.titleFont = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onColorChanged(state: State, value: string | undefined) {
  if (multiSelectVisual.selected.length) {
    modifySpecification(() => {
      for (const subsystem of multiSelectVisual.selected) {
        subsystem.specification.backgroundColor = value;
      }
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneSystemSelected) {
    modifySpecification(() => {
      oneSystemSelected!.specification.backgroundColor = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneLinkTitleSelected) {
    modifySpecification(() => {
      oneLinkTitleSelected!.specification.titleBackgroundColor = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (oneLinkSelected) {
    modifySpecification(() => {
      oneLinkSelected!.specification.backgroundColor = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function setDuplicating(system: RuntimeSystem): void {
  systemToDuplicate = system;

  // Must be set before setting the selected systems.
  multiMovingVisual.tint = "#4363d8";

  multiSelectVisual.setSelectedFromSystem(system);
  multiMovingVisual.setSelectedFromSystem(system);

  let left = Number.MAX_SAFE_INTEGER;
  let right = -Number.MAX_SAFE_INTEGER;
  let top = Number.MAX_SAFE_INTEGER;
  let bottom = -Number.MAX_SAFE_INTEGER;

  for (const ss of system.systems) {
    if (ss.position.x < left) {
      left = ss.position.x;
    }

    if (ss.position.x + ss.size.width > right) {
      right = ss.position.x + ss.size.width;
    }

    if (ss.position.y < top) {
      top = ss.position.y;
    }

    if (ss.position.y + ss.size.height > bottom) {
      bottom = ss.position.y + ss.size.height;
    }
  }

  // Happens when there are no subsystems.
  if (left > right) {
    left = right;
  }

  if (top > bottom) {
    top = bottom;
  }

  multiPickedUpAt = {
    x: Math.floor(left + (right - left) / 2),
    y: Math.floor(top + (bottom - top) / 2),
  };
}

function onAction(state: State, value: ActionsProperty.SelectAction): void {
  if (multiSelectVisual.selected.length) {
    if (value === "delete") {
      modifySpecification(() => {
        removeSubsystems(multiSelectVisual.selected);
      }).then(() => {
        onBegin(state);
        tick();
      });
    } else if (value === "duplicate") {
      setDuplicating({
        systems: [...multiSelectVisual.selected],
        links: state.simulator
          .getSystem()
          .links.filter(
            link =>
              multiSelectVisual.selected.some(ss => ss.id === link.a) &&
              multiSelectVisual.selected.some(ss => ss.id === link.b),
          ),
      } as RuntimeSystem);

      onPointerMove(state);
      tick();
    } else if (value === "paint") {
      Paint.choose({
        onChange: value => {
          onColorChanged(state, value);
        },
      });
    }

    return;
  }

  if (oneSystemSelected) {
    if (value === "delete") {
      modifySpecification(() => {
        removeSubsystems([oneSystemSelected!]);
      }).then(() => {
        onBegin(state);
        tick();
      });
    } else if (value === "duplicate") {
      setDuplicating({
        systems: [oneSystemSelected],
        links: [],
      } as unknown as RuntimeSystem);

      onPointerMove(state);
      tick();
    } else if (value === "paint") {
      Paint.choose({
        onChange: value => {
          onColorChanged(state, value);
        },
      });
    }

    return;
  }

  if (oneLinkTitleSelected) {
    if (value === "delete") {
      modifySpecification(() => {
        removeLinkTitle(oneLinkTitleSelected!);
      }).then(() => {
        onBegin(state);
        tick();
      });
    } else if (value === "paint") {
      Paint.choose({
        onChange: value => {
          onColorChanged(state, value);
        },
      });
    }

    return;
  }

  if (oneLinkSelected) {
    if (value === "delete") {
      modifySpecification(() => {
        removeLink(state.simulator.getSystem(), oneLinkSelected!);
      }).then(() => {
        onBegin(state);
        tick();
      });
    } else if (value === "paint") {
      Paint.choose({
        onChange: value => {
          onColorChanged(state, value);
        },
      });
    }

    return;
  }
}

function onSelected(state: State): void {
  if (multiSelectVisual.selected.length) {
    const border = multiSelectVisual.selected.every(
      ss => ss.borderPattern === multiSelectVisual.selected[0].borderPattern,
    )
      ? multiSelectVisual.selected[0].borderPattern
      : undefined;

    SystemBorderProperty.show({
      initial: border,
      onChange: value => {
        onBorderPatternChange(state, value);
      },
    });

    const textAlign = multiSelectVisual.selected.every(
      ss => ss.titleAlign === multiSelectVisual.selected[0].titleAlign,
    )
      ? multiSelectVisual.selected[0].titleAlign
      : undefined;

    TextAlignProperty.show({
      initial: textAlign,
      onChange: value => {
        onTextAlignChange(state, value);
      },
    });

    const textFont = multiSelectVisual.selected.every(
      ss => ss.titleFont === multiSelectVisual.selected[0].titleFont,
    )
      ? multiSelectVisual.selected[0].titleFont
      : undefined;

    TextFontProperty.show({
      initial: textFont,
      onChange: value => {
        onTextFontChange(state, value);
      },
    });

    ActionsProperty.show({
      onChange: value => {
        onAction(state, value);
      },
    });

    const backgroundColor = multiSelectVisual.selected.every(
      ss =>
        ss.backgroundColor === multiSelectVisual.selected[0].backgroundColor,
    )
      ? multiSelectVisual.selected[0].backgroundColor
      : undefined;

    Paint.setColor(backgroundColor);

    return;
  }

  if (oneSystemSelected) {
    SystemBorderProperty.show({
      initial: oneSystemSelected.borderPattern,
      onChange: value => {
        onBorderPatternChange(state, value);
      },
    });

    TextAlignProperty.show({
      initial: oneSystemSelected.titleAlign,
      onChange: value => {
        onTextAlignChange(state, value);
      },
    });

    TextFontProperty.show({
      initial: oneSystemSelected.titleFont,
      onChange: value => {
        onTextFontChange(state, value);
      },
    });

    ActionsProperty.show({
      onChange: value => {
        onAction(state, value);
      },
    });

    Paint.setColor(oneSystemSelected.backgroundColor);

    return;
  }

  if (oneLinkTitleSelected) {
    TextAlignProperty.show({
      initial: oneLinkTitleSelected.titleAlign,
      onChange: value => {
        onTextAlignChange(state, value);
      },
    });

    TextFontProperty.show({
      initial: oneLinkTitleSelected.titleFont,
      onChange: value => {
        onTextFontChange(state, value);
      },
    });

    ActionsProperty.show({
      actions: ["delete", "paint"],
      onChange: value => {
        onAction(state, value);
      },
    });

    Paint.setColor(oneLinkTitleSelected.titleBackgroundColor);

    return;
  }

  if (oneLinkSelected) {
    LineStartProperty.show({
      initial: oneLinkSelected.startPattern,
      onChange: value => {
        if (oneLinkSelected) {
          modifySpecification(() => {
            oneLinkSelected!.specification.startPattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    LineMiddleProperty.show({
      initial: oneLinkSelected.middlePattern,
      onChange: value => {
        if (oneLinkSelected) {
          modifySpecification(() => {
            oneLinkSelected!.specification.middlePattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    LineEndProperty.show({
      initial: oneLinkSelected.endPattern,
      onChange: value => {
        if (oneLinkSelected) {
          modifySpecification(() => {
            oneLinkSelected!.specification.endPattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    ActionsProperty.show({
      actions: ["delete", "paint"],
      onChange: value => {
        onAction(state, value);
      },
    });

    Paint.setColor(oneLinkSelected.backgroundColor);

    return;
  }
}

const operation: Operation = {
  id: "operation-select",
  setup: () => {
    //
    // Move multiple systems.
    //
    viewport.addChild(multiSelectVisual);
    viewport.addChild(multiMovingVisual);

    //
    // Move one system.
    //
    viewport.addChild(oneSystemHoverVisual);
    viewport.addChild(oneSystemSelectedVisual);
    viewport.addChild(oneSystemMoveVisual);

    //
    // Move one link.
    //
    viewport.addChild(oneLinkSelected1Visual);
    viewport.addChild(oneLinkSelected2Visual);
    viewport.addChild(oneLinkHoverVisual);
    viewport.addChild(oneLinkMoveVisual);

    //
    // Move into container.
    //
    viewport.addChild(parentSystemSelectVisual);
  },
  onBegin,
  onEnd: () => {
    resetMultiSelection();
    resetSingleSelection();

    //
    // Move into container.
    //
    parentSystemSelectVisual.visible = false;

    //
    // Shared.
    //
    viewport.pause = false;
  },
  onPointerDown: state => {
    viewport.pause = true;

    //
    // Duplicate one or many systems - Stage 2.
    //
    // One or many systems are selected and being dragged by the user to be
    // placed.
    //
    if (systemToDuplicate) {
      return;
    }

    //
    // Move multiple systems - Stage 2.
    //
    // Multiple systems are selected and the user clicks on one of them.
    // We assume they want to drag those systems.
    //
    const multiSystemToPickUp = state.simulator.getSubsystemAt(
      state.x,
      state.y,
    );

    if (
      multiSystemToPickUp &&
      multiSelectVisual.selected.includes(multiSystemToPickUp)
    ) {
      multiPickedUpAt = { x: state.x, y: state.y };

      return;
    }

    //
    // Move multiple systems - Stage 2 - Cancel.
    //
    // At this point, if the user had multiple systems selected,
    // they become unselected, as the click is done outside one of them.
    //
    resetMultiSelection();

    //
    // Select one system or select one link.
    //
    resetSingleSelection();

    //
    // Select one link title.
    //
    const linkTitleToSelect = state.simulator.getLinkByTitleAt(
      state.x,
      state.y,
    );

    if (linkTitleToSelect) {
      oneLinkTitleSelected = linkTitleToSelect;

      onSelected(state);
      onPointerMove(state);

      return;
    }

    //
    // Select one link.
    //
    // The user clicks on a link.
    // If the user clicks on a line termination, we assume they want to
    // drag it to move the link, until the click is unpressed.
    //
    const linkToSelect = state.simulator.getLinkAt(state.x, state.y);

    if (linkToSelect) {
      oneLinkSelected = linkToSelect;

      const path = state.simulator.getPath(linkToSelect)!;
      const boundaries = state.simulator.getBoundaries();

      const [startX, startY] = path.at(0)!;
      const [endX, endY] = path.at(-1)!;

      if (
        state.x + boundaries.translateX === startX &&
        state.y + boundaries.translateY === startY
      ) {
        oneLinkSelectedBeforeSystem = linkToSelect.systemA;
      } else if (
        state.x + boundaries.translateX === endX &&
        state.y + boundaries.translateY === endY
      ) {
        oneLinkSelectedBeforeSystem = linkToSelect.systemB;
      }

      onSelected(state);
      onPointerMove(state);

      return;
    }

    //
    // Select one system.
    //
    // The user clicks on the edge of a container or a system.
    // We assume they want to drag it, until the click is unpressed.
    //
    const systemToSelect = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      /* Whitebox */
      (systemToSelect &&
        systemToSelect.systems.length &&
        isSystemPadding(systemToSelect, state.x, state.y)) ||
      /* Blackbox */
      (systemToSelect && !systemToSelect.systems.length)
    ) {
      oneSystemSelected = systemToSelect;
      oneSystemPickedUpAt = { x: state.x, y: state.y };

      onSelected(state);
      onPointerMove(state);

      return;
    }

    //
    // Select multiple systems - Stage 1.
    //
    // The user clicks anywhere else than the use cases above.
    // We assume they want to start a multi selection.
    //
    multiSelectStartAt = { x: state.x, y: state.y };
    multiSelectEndAt = null;

    onPointerMove(state);
  },
  onPointerUp: state => {
    viewport.pause = false;

    //
    // Move or duplicate multiple systems into a container, or not. - Stage 2.
    //
    if (multiPickedUpAt) {
      let parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      // The systems are moved to the perimeter of another system,
      // which is part of a list.
      if (
        parent.parent?.type === "list" &&
        isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
      ) {
        parent = parent.parent;
      }

      if (
        // User moves the ss over itself.
        multiSelectVisual.selected.some(ss => ss.id === parent.id) ||
        // User moves the ss inside the same parent.
        multiSelectVisual.selected.some(ss => ss.parent!.id === parent.id) ||
        // User moves the ss inside a child ss.
        (parent.id &&
          multiSelectVisual.selected.some(ss => isChildOf(ss, parent.id!)))
      ) {
        const deltaX = state.x - multiPickedUpAt!.x;
        const deltaY = state.y - multiPickedUpAt!.y;

        if (deltaX !== 0 || deltaY !== 0) {
          modifySpecification(() => {
            if (systemToDuplicate) {
              const newSystems = duplicateSystems(
                multiSelectVisual.selected,
                parent,
                multiSelectVisual.selected.map(ss => ({
                  x: ss.specification.position.x + deltaX,
                  y: ss.specification.position.y + deltaY,
                })),
                systemToDuplicate.links,
              );

              multiSelectVisual.setSelectedFromSubsystems(newSystems);
            } else {
              moveSystems(multiSelectVisual.selected, deltaX, deltaY);
            }
          }).then(() => {
            onModified(state);
            tick();
          });
        } else {
          onModified(state);
        }
      } else {
        // Move the ss inside a container.
        if (parent.id) {
          // Padding and title offsets.
          const containerOffset = state.simulator.getParentOffset(parent);

          modifySpecification(() => {
            if (systemToDuplicate) {
              // Local position inside the container.
              const x = state.x - parent.position.x - containerOffset.x;
              const y = state.y - parent.position.y - containerOffset.y;

              const positions = multiSelectVisual.selected.map(ss => ({
                x: x + (ss.position.x - multiPickedUpAt!.x),
                y: y + (ss.position.y - multiPickedUpAt!.y),
              }));

              const newSystems = duplicateSystems(
                multiSelectVisual.selected,
                parent,
                positions,
                systemToDuplicate.links,
              );

              multiSelectVisual.setSelectedFromSubsystems(newSystems);
            } else {
              // The ss dragged by the user.
              const multiPickedUp = state.simulator.getSubsystemAt(
                multiPickedUpAt!.x,
                multiPickedUpAt!.y,
              )!;

              // Delta of top-left of the ss with the dragging anchor.
              const localDeltaX =
                multiPickedUp!.position.x - multiPickedUpAt!.x;
              const localDeltaY =
                multiPickedUp!.position.y - multiPickedUpAt!.y;

              // Local position inside the container.
              const x =
                state.x - parent.position.x - containerOffset.x + localDeltaX;

              const y =
                state.y - parent.position.y - containerOffset.y + localDeltaY;

              // Local positions of other moved systems,
              // based on the system dragged by the user.
              const positions = multiSelectVisual.selected.map(ss => {
                if (ss.id === multiPickedUp.id) {
                  return { x, y };
                }

                return {
                  x: x + (ss.position.x - multiPickedUp.position.x),
                  y: y + (ss.position.y - multiPickedUp.position.y),
                };
              });

              moveSubsystemsToParent(
                multiSelectVisual.selected,
                parent,
                positions,
              );
            }
          }).then(() => {
            onModified(state);
            tick();
          });
        } /* Move the ss outside of a container (i.e. in the root container) */ else {
          const deltaX = state.x - multiPickedUpAt!.x;
          const deltaY = state.y - multiPickedUpAt!.y;

          const positions = multiSelectVisual.selected.map(ss => ({
            x: ss.position.x + deltaX,
            y: ss.position.y + deltaY,
          }));

          modifySpecification(() => {
            if (systemToDuplicate) {
              const newSystems = duplicateSystems(
                multiSelectVisual.selected,
                parent,
                positions,
                systemToDuplicate.links,
              );

              multiSelectVisual.setSelectedFromSubsystems(newSystems);
            } else {
              moveSubsystemsToParent(
                multiSelectVisual.selected,
                parent,
                positions,
              );
            }
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      }

      return;
    }

    //
    // Move multiple systems - Stage 1.
    //
    if (multiSelectStartAt && multiSelectEndAt) {
      // Systems are selected in onPointerMove.
      if (multiSelectVisual.selected.length) {
        multiSelectStartAt = null;
        multiSelectEndAt = null;

        onSelected(state);
        onPointerMove(state);
      } else {
        onBegin(state);
      }

      return;
    }

    //
    // Select one link title.
    //
    if (oneLinkTitleSelected) {
      onModified(state);

      return;
    }

    //
    // Move one link, or not.
    //
    if (oneLinkSelected) {
      if (oneLinkSelectedBeforeSystem && oneLinkSelectedAfterSystem) {
        modifySpecification(() => {
          moveLink(
            oneLinkSelected!,
            oneLinkSelectedBeforeSystem!.id,
            oneLinkSelectedAfterSystem!.id,
          );
        }).then(() => {
          onModified(state);
          tick();
        });
      } else {
        onModified(state);
      }

      return;
    }

    //
    // Move or duplicate one system into a container, or not.
    //
    if (oneSystemSelected && oneSystemPickedUpAt) {
      let parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      // The system is moved to the perimeter of another system,
      // which is part of a list.
      if (
        parent.parent?.type === "list" &&
        isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
      ) {
        parent = parent.parent;
      }

      if (
        // User moves the ss over itself.
        oneSystemSelected!.id === parent.id ||
        // User moves the ss inside the same parent.
        oneSystemSelected!.parent!.id === parent.id ||
        // User moves the ss inside a child ss.
        (parent.id && isChildOf(oneSystemSelected!, parent.id))
      ) {
        const x = state.x - oneSystemPickedUpAt!.x;
        const y = state.y - oneSystemPickedUpAt!.y;

        if (x !== 0 || y !== 0) {
          modifySpecification(() => {
            moveSystems([oneSystemSelected!], x, y);
          }).then(() => {
            onModified(state);
            tick();
          });
        } else {
          onModified(state);
        }
      } else {
        const deltaX = oneSystemSelected!.position.x - oneSystemPickedUpAt!.x;
        const deltaY = oneSystemSelected!.position.y - oneSystemPickedUpAt!.y;

        let x: number;
        let y: number;

        // Move the ss inside a container.
        if (parent.id) {
          const offset = state.simulator.getParentOffset(parent);

          x = state.x - parent.position.x - offset.x + deltaX;
          y = state.y - parent.position.y - offset.y + deltaY;
        } /* Move the ss outside of a container (i.e. in the root container) */ else {
          x = state.x + deltaX;
          y = state.y + deltaY;
        }

        modifySpecification(() => {
          moveSubsystemsToParent([oneSystemSelected!], parent, [{ x, y }]);
        }).then(() => {
          onModified(state);
          tick();
        });
      }

      return;
    }

    //
    // Operation incomplete.
    //
    onBegin(state);
  },
  onPointerMove,
  onKeyDown: (state, event) => {
    //
    // Select everything.
    //
    if (event.ctrlKey && event.key === "a") {
      onBegin(state);

      multiSelectVisual.setLassoPosition(
        -Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      );

      multiSelectVisual.setSelectedFromLasso(state.simulator);

      multiMovingVisual.setLassoPosition(
        -Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      );

      multiMovingVisual.setSelectedFromLasso(state.simulator);

      onSelected(state);

      return;
    }

    //
    // Delete one or many things.
    //
    if (event.key === "Delete") {
      if (multiSelectVisual.selected.length) {
        modifySpecification(() => {
          removeSubsystems(multiSelectVisual.selected);
        }).then(() => {
          onBegin(state);
          tick();
        });

        return;
      }

      if (oneSystemSelected) {
        modifySpecification(() => {
          removeSubsystems([oneSystemSelected!]);
        }).then(() => {
          onBegin(state);
          tick();
        });

        return;
      }

      if (oneLinkTitleSelected) {
        modifySpecification(() => {
          removeLinkTitle(oneLinkTitleSelected!);
        }).then(() => {
          onBegin(state);
          tick();
        });

        return;
      }

      if (oneLinkSelected) {
        modifySpecification(() => {
          removeLink(state.simulator.getSystem(), oneLinkSelected!);
        }).then(() => {
          onBegin(state);
          tick();
        });

        return;
      }
    }

    //
    // Copy one or many systems & links in the clipboard.
    //
    if (event.ctrlKey && event.key === "c") {
      const systems: RuntimeSubsystem[] = [];

      if (multiSelectVisual.selected.length) {
        systems.push(...multiSelectVisual.selected);
      } else if (oneSystemSelected) {
        systems.push(oneSystemSelected);
      }

      if (!systems.length) {
        return;
      }

      let rootSystem = systems[0] as unknown as RuntimeSystem;

      while (rootSystem.parent) {
        rootSystem = rootSystem.parent;
      }

      const specification: System = {
        specificationVersion: "1.0.0",
        title: "",
        systems: systems.map(ss => ss.specification),
        links: (rootSystem.specification.links ?? []).filter(
          link =>
            systems.some(ss => ss.id === link.a) &&
            systems.some(ss => ss.id === link.b),
        ),
      };

      navigator.clipboard.writeText(JSON.stringify(specification, null, 2));

      return;
    }

    //
    // Paste many systems & links from the clipboard.
    //
    if (event.ctrlKey && event.key === "v") {
      navigator.clipboard.readText().then(fromClipboard => {
        let result: ReturnType<typeof loadJSON>;

        try {
          result = loadJSON(fromClipboard);
        } catch {
          /* NOOP */
          return;
        }

        if (result.errors.length) {
          return;
        }

        setDuplicating(result.system);

        onPointerMove(state);
        tick();
      });
    }
  },
  onPointerEnter: () => {},
  onPointerLeave: () => {},
};

export default operation;
