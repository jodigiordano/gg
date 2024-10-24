import {
  addLink,
  BorderEdge,
  isSubsystemOf,
  moveLink,
  removeLink,
  removeLinkTitle,
  RuntimeLink,
  RuntimeSubsystem,
  setLinkTitle,
  TextAlign,
  TextFont,
} from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import SystemLinker from "../renderer/systemLinker.js";
import {
  calculateTextSizeForLinkTitle,
  modifySpecification,
} from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import * as BorderProperty from "../properties/border.js";
import * as BorderEdgesProperty from "../properties/borderEdges.js";
import * as LineStartProperty from "../properties/lineStart.js";
import * as LineMiddleProperty from "../properties/lineMiddle.js";
import * as LineEndProperty from "../properties/lineEnd.js";
import * as TextAlignProperty from "../properties/textAlign.js";
import * as TextFontProperty from "../properties/textFont.js";
import * as OpacityProperty from "../properties/opacity.js";
import * as ActionsProperty from "../properties/actions.js";
import * as Paint from "../properties/actionPaint.js";
import * as SetTitle from "../properties/actionSetTitle.js";
import { BorderPattern } from "@gg/core";

//
// Hover a link.
//

const hoverLinkVisual = new SystemSelector();

//
// Select a link or link title.
//

const linkSelected1Visual = new SystemSelector();
const linkSelected2Visual = new SystemSelector();

let linkSelected: RuntimeLink | null = null;
let linkTitleSelected: RuntimeLink | null = null;

//
// Create or move a link between two systems.
//

const linkLinkerVisual = new SystemLinker();

//
// Move a link.
//

let moveLinkSystemBefore: RuntimeSubsystem | null = null;
let moveLinkSystemAfter: RuntimeSubsystem | null = null;

//
// Create a new link.
//

const createLinkFromVisual = new SystemSelector();
const createLinkToVisual = new SystemSelector();

let createLinkSystemA: RuntimeSubsystem | null = null;

//
// Whether the pointer is in the canvas or not.
//
let inCanvas: boolean = true;

//
// Handlers.
//

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
  linkSelected1Visual.visible = false;
  linkSelected2Visual.visible = false;
  hoverLinkVisual.visible = false;
  linkLinkerVisual.visible = false;
  createLinkFromVisual.visible = false;
  createLinkToVisual.visible = false;
  moveLinkSystemAfter = null;

  //
  // Creating a new link.
  //
  if (createLinkSystemA) {
    createLinkFromVisual.visible = true;
    createLinkFromVisual.setPosition(createLinkSystemA, { x: 0, y: 0 });

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      subsystem &&
      !isSubsystemOf(createLinkSystemA, subsystem) &&
      !isSubsystemOf(subsystem, createLinkSystemA)
    ) {
      createLinkToVisual.visible = true;
      createLinkToVisual.setPosition(subsystem, { x: 0, y: 0 });
    }

    linkLinkerVisual.visible = true;
    linkLinkerVisual.setPosition(
      createLinkSystemA.position.x +
        Math.floor(createLinkSystemA.size.width / 2),
      createLinkSystemA.position.y +
        Math.floor(createLinkSystemA.size.height / 2),
      state.x,
      state.y,
    );

    return;
  }

  //
  // Hovering one link title.
  //
  const linkTitleToSelect = state.simulator.getLinkByTitleAt(state.x, state.y);

  if (linkTitleToSelect) {
    hoverLinkVisual.visible = true;
    hoverLinkVisual.setPositionRect(
      linkTitleToSelect.titlePosition.x,
      linkTitleToSelect.titlePosition.y,
      linkTitleToSelect.titlePosition.x + linkTitleToSelect.titleSize.width,
      linkTitleToSelect.titlePosition.y + linkTitleToSelect.titleSize.height,
    );
  } else {
    //
    // Hovering one link.
    //
    const linkToSelect = state.simulator.getLinkAt(state.x, state.y);

    if (linkToSelect) {
      hoverLinkVisual.visible = true;
      hoverLinkVisual.setPositionRect(state.x, state.y, state.x, state.y);
    } else {
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
        createLinkFromVisual.visible = true;
        createLinkFromVisual.setPosition(hoveringSystem, { x: 0, y: 0 });
      }
    }
  }

  //
  // Selecting one link title.
  //
  if (linkTitleSelected) {
    linkSelected1Visual.visible = true;
    linkSelected1Visual.setPositionRect(
      linkTitleSelected.titlePosition.x,
      linkTitleSelected.titlePosition.y,
      linkTitleSelected.titlePosition.x + linkTitleSelected.titleSize.width,
      linkTitleSelected.titlePosition.y + linkTitleSelected.titleSize.height,
    );
  }

  //
  // Selecting one link.
  //
  if (linkSelected) {
    const path = state.simulator.getPath(linkSelected)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;
    const [endX, endY] = path.at(-1)!;

    linkSelected1Visual.visible = true;
    linkSelected1Visual.setPositionRect(
      startX - boundaries.translateX - 0.25,
      startY - boundaries.translateY - 0.25,
      startX - boundaries.translateX + 0.25,
      startY - boundaries.translateY + 0.25,
    );

    linkSelected2Visual.visible = true;
    linkSelected2Visual.setPositionRect(
      endX - boundaries.translateX - 0.25,
      endY - boundaries.translateY - 0.25,
      endX - boundaries.translateX + 0.25,
      endY - boundaries.translateY + 0.25,
    );
  }

  //
  // Moving one link.
  //
  if (linkSelected && moveLinkSystemBefore) {
    const path = state.simulator.getPath(linkSelected)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] =
      moveLinkSystemBefore.id === linkSelected.b ? path.at(-1)! : path.at(0)!;

    linkLinkerVisual.visible = true;
    linkLinkerVisual.setPosition(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      state.x,
      state.y,
    );

    linkSelected2Visual.visible = false;
    linkSelected1Visual.visible = true;
    linkSelected1Visual.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const oneLinkNewB = state.simulator.getSubsystemAt(state.x, state.y);

    if (oneLinkNewB) {
      const oneLinkA =
        moveLinkSystemBefore.id === linkSelected.a
          ? linkSelected.systemB
          : linkSelected.systemA;

      if (
        oneLinkNewB.id !== linkSelected.a &&
        oneLinkNewB.id !== linkSelected.b &&
        !isSubsystemOf(oneLinkNewB, oneLinkA) &&
        !isSubsystemOf(oneLinkA, oneLinkNewB)
      ) {
        createLinkFromVisual.visible = true;
        createLinkFromVisual.setPosition(oneLinkNewB, { x: 0, y: 0 });

        moveLinkSystemAfter = oneLinkNewB;
      }
    }

    return;
  }
}

function setNewLineProperties(): void {
  LineStartProperty.show({
    initial: LineStartProperty.value(),
  });

  LineMiddleProperty.show({
    initial: LineMiddleProperty.value(),
  });

  LineEndProperty.show({
    initial: LineEndProperty.value(),
  });

  OpacityProperty.show({
    initial: OpacityProperty.value(),
  });

  ActionsProperty.show({
    actions: ["paint"],
    onChange: value => {
      if (value === "paint") {
        Paint.choose();
      }
    },
  });

  Paint.setColor(Paint.value());
}

function resetSingleSelection(): void {
  linkSelected1Visual.visible = false;
  linkSelected2Visual.visible = false;
  hoverLinkVisual.visible = false;
  linkLinkerVisual.visible = false;
  createLinkFromVisual.visible = false;
  createLinkToVisual.visible = false;
  linkSelected = null;
  linkTitleSelected = null;
  moveLinkSystemBefore = null;
  moveLinkSystemAfter = null;
  createLinkSystemA = null;

  BorderProperty.hide();
  BorderEdgesProperty.hide();
  LineStartProperty.hide();
  LineMiddleProperty.hide();
  LineEndProperty.hide();
  TextAlignProperty.hide();
  TextFontProperty.hide();
  OpacityProperty.hide();
  ActionsProperty.hide();
}

function onModified(state: State): void {
  // When a link title is modified (ex: moved, property change, etc.), reselect it.
  if (linkTitleSelected) {
    const link = state.simulator
      .getSystem()
      .links.find(link => link.index === linkTitleSelected?.index)!;

    resetSingleSelection();

    linkTitleSelected = link;

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // When a link is modified (ex: moved, property change, etc.), reselect it.
  if (linkSelected) {
    const link = state.simulator
      .getSystem()
      .links.find(link => link.index === linkSelected?.index)!;

    resetSingleSelection();

    linkSelected = link;

    onSelected(state);
    onPointerMove(state);

    return;
  }

  // Default behavior.
  onBegin(state);
}

function onBegin(state: State): void {
  resetSingleSelection();
  setNewLineProperties();

  viewport.pause = false;
  onPointerMove(state);
}

function onBorderChange(state: State, value: BorderPattern): void {
  if (linkTitleSelected) {
    modifySpecification(() => {
      linkTitleSelected!.specification.titleBorderPattern = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onBorderEdgesChange(state: State, value: BorderEdge): void {
  if (linkTitleSelected) {
    modifySpecification(() => {
      linkTitleSelected!.specification.titleBorderEdges = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onTextAlignChange(state: State, value: TextAlign): void {
  if (linkTitleSelected) {
    modifySpecification(() => {
      linkTitleSelected!.specification.titleAlign = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onTextFontChange(state: State, value: TextFont): void {
  if (linkTitleSelected) {
    modifySpecification(() => {
      const size = calculateTextSizeForLinkTitle(
        linkTitleSelected!.title.replaceAll("\\n", "\n"),
        value,
        linkTitleSelected!.titleAlign,
      );

      setLinkTitle(
        linkTitleSelected!,
        linkTitleSelected!.title,
        value,
        linkTitleSelected!.titleAlign,
        size.width,
        size.height,
      );
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onColorChanged(state: State, value: string | undefined) {
  if (linkTitleSelected) {
    modifySpecification(() => {
      linkTitleSelected!.specification.titleBackgroundColor = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (linkSelected) {
    modifySpecification(() => {
      linkSelected!.specification.backgroundColor = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onTitleChanged(
  state: State,
  value: string,
  font: TextFont,
  align: TextAlign,
) {
  const selected = linkTitleSelected ?? linkSelected;

  if (selected) {
    modifySpecification(() => {
      const size = calculateTextSizeForLinkTitle(value, font, align);

      setLinkTitle(
        selected!,
        value.replace(/\n/g, "\\n"),
        font,
        align,
        size.width,
        size.height,
      );
    }).then(() => {
      linkTitleSelected = selected;
      linkSelected = null;

      onModified(state);
      tick();
    });

    return;
  }
}

function onOpacityChange(state: State, value: number): void {
  if (linkTitleSelected) {
    modifySpecification(() => {
      linkTitleSelected!.specification.titleOpacity = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }

  if (linkSelected) {
    modifySpecification(() => {
      linkSelected!.specification.opacity = value;
      linkSelected!.specification.titleOpacity = value;
    }).then(() => {
      onModified(state);
      tick();
    });

    return;
  }
}

function onAction(state: State, value: ActionsProperty.SelectAction): void {
  if (linkTitleSelected) {
    if (value === "delete") {
      modifySpecification(() => {
        removeLinkTitle(linkTitleSelected!);
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
    } else if (value === "set-title") {
      SetTitle.open({
        value: linkTitleSelected.title,
        font: linkTitleSelected.titleFont,
        align: linkTitleSelected.titleAlign,
        onChange: (value, font, align) => {
          onTitleChanged(state, value, font, align);
        },
      });
    }

    return;
  }

  if (linkSelected) {
    if (value === "delete") {
      modifySpecification(() => {
        removeLink(state.simulator.getSystem(), linkSelected!);
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
    } else if (value === "set-title") {
      SetTitle.open({
        value: linkSelected.title,
        font: linkSelected.titleFont,
        align: linkSelected.titleAlign,
        onChange: (value, font, align) => {
          onTitleChanged(state, value, font, align);
        },
      });
    }

    return;
  }
}

function onSelected(state: State): void {
  if (linkTitleSelected) {
    BorderProperty.show({
      initial: linkTitleSelected.titleBorderPattern,
      onChange: value => {
        onBorderChange(state, value);
      },
    });

    BorderEdgesProperty.show({
      initial: linkTitleSelected.titleBorderEdges,
      onChange: value => {
        onBorderEdgesChange(state, value);
      },
    });

    TextAlignProperty.show({
      initial: linkTitleSelected.titleAlign,
      onChange: value => {
        onTextAlignChange(state, value);
      },
    });

    TextFontProperty.show({
      initial: linkTitleSelected.titleFont,
      onChange: value => {
        onTextFontChange(state, value);
      },
    });

    OpacityProperty.show({
      initial: linkTitleSelected.titleOpacity,
      onChange: value => {
        onOpacityChange(state, value);
      },
    });

    ActionsProperty.show({
      actions: ["delete", "paint", "set-title"],
      onChange: value => {
        onAction(state, value);
      },
    });

    Paint.setColor(linkTitleSelected.titleBackgroundColor);

    return;
  }

  if (linkSelected) {
    LineStartProperty.show({
      initial: linkSelected.startPattern,
      onChange: value => {
        if (linkSelected) {
          modifySpecification(() => {
            linkSelected!.specification.startPattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    LineMiddleProperty.show({
      initial: linkSelected.middlePattern,
      onChange: value => {
        if (linkSelected) {
          modifySpecification(() => {
            linkSelected!.specification.middlePattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    LineEndProperty.show({
      initial: linkSelected.endPattern,
      onChange: value => {
        if (linkSelected) {
          modifySpecification(() => {
            linkSelected!.specification.endPattern = value;
          }).then(() => {
            onModified(state);
            tick();
          });
        }
      },
    });

    OpacityProperty.show({
      initial: linkSelected.opacity,
      onChange: value => {
        onOpacityChange(state, value);
      },
    });

    ActionsProperty.show({
      actions: ["delete", "paint", "set-title"],
      onChange: value => {
        onAction(state, value);
      },
    });

    Paint.setColor(linkSelected.backgroundColor);

    return;
  }

  setNewLineProperties();
}

function onPointerUp(state: State): void {
  viewport.pause = false;

  //
  // Create a new line.
  //
  if (createLinkSystemA) {
    const b = state.simulator.getSubsystemAt(state.x, state.y);

    if (b && b.id !== createLinkSystemA.id) {
      modifySpecification(() => {
        linkSelected = addLink(
          state.simulator.getSystem(),
          createLinkSystemA!.id,
          b!.id,
          {
            startPattern: LineStartProperty.value(),
            middlePattern: LineMiddleProperty.value(),
            endPattern: LineEndProperty.value(),
            backgroundColor: Paint.value(),
            opacity: OpacityProperty.value(),
            titleOpacity: OpacityProperty.value(),
          },
        );
      }).then(() => {
        onModified(state);
        tick();
      });
    } else {
      onBegin(state);
      tick();
    }

    return;
  }

  //
  // Select one link title.
  //
  if (linkTitleSelected) {
    onModified(state);

    return;
  }

  //
  // Move one link, or not.
  //
  if (linkSelected) {
    if (
      moveLinkSystemBefore &&
      moveLinkSystemAfter &&
      // The user must move the linker at least one block.
      linkLinkerVisual.length >= 1
    ) {
      modifySpecification(() => {
        moveLink(
          linkSelected!,
          moveLinkSystemBefore!.id,
          moveLinkSystemAfter!.id,
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
  // Operation incomplete.
  //
  onBegin(state);
}

const operation: Operation = {
  id: "operation-link",
  setup: () => {
    viewport.addChild(linkSelected1Visual);
    viewport.addChild(linkSelected2Visual);
    viewport.addChild(hoverLinkVisual);
    viewport.addChild(linkLinkerVisual);
    viewport.addChild(createLinkFromVisual);
    viewport.addChild(createLinkToVisual);
  },
  onBegin,
  onEnd: () => {
    resetSingleSelection();
    viewport.pause = false;
  },
  onPointerDown: state => {
    viewport.pause = true;

    resetSingleSelection();

    //
    // Select one link title.
    //
    const linkTitleToSelect = state.simulator.getLinkByTitleAt(
      state.x,
      state.y,
    );

    if (linkTitleToSelect) {
      linkTitleSelected = linkTitleToSelect;

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
      linkSelected = linkToSelect;

      const path = state.simulator.getPath(linkToSelect)!;
      const boundaries = state.simulator.getBoundaries();

      const [startX, startY] = path.at(0)!;
      const [endX, endY] = path.at(-1)!;

      if (
        state.x + boundaries.translateX === startX &&
        state.y + boundaries.translateY === startY
      ) {
        moveLinkSystemBefore = linkToSelect.systemA;
      } else if (
        state.x + boundaries.translateX === endX &&
        state.y + boundaries.translateY === endY
      ) {
        moveLinkSystemBefore = linkToSelect.systemB;
      }

      onSelected(state);
      onPointerMove(state);

      return;
    }

    //
    // Select one system.
    //
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      createLinkSystemA = subsystem;

      onSelected(state);
      onPointerMove(state);

      return;
    }

    //
    // Operation incomplete.
    //
    onBegin(state);
  },
  onPointerUp,
  onPointerMove,
  onKeyDown: () => {},
  onPointerEnter: () => {
    inCanvas = true;
  },
  onPointerLeave: () => {
    inCanvas = false;
  },
  onPointerDoublePress: state => {
    onAction(state, "set-title");
  },
  onEvent: () => {},
  onWindowPointerMove: state => {
    if (!inCanvas && viewport.pause) {
      onPointerMove(state);
    }
  },
  onWindowPointerUp: state => {
    if (!inCanvas && viewport.pause) {
      onPointerUp(state);
    }
  },
};

export default operation;
