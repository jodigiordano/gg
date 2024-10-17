import { RuntimeLink, RuntimeSystem } from "./runtime";
import { Link } from "./specification";
import { sanitizeTitle, getTitleLength, getSubsystemById } from "./helpers.js";

export function initLink(
  link: RuntimeLink,
  specification: Link,
  system: RuntimeSystem,
  index: number,
): void {
  // Set the specification.
  link.specification = specification;

  // Set array position in the system.
  link.index = index;

  // Set the title.
  link.title = sanitizeTitle(link.title ?? "");

  // Set the title size.
  link.titleSize ??= getTitleLength(link.title);

  // Set the title font.
  link.titleFont ??= "text";

  // Set the title alignment.
  link.titleAlign ??= "center";

  // Set the title position.
  // This property is set later on by the simulator.
  link.titlePosition = {
    x: 0,
    y: 0,
  };

  // Set the title border.
  link.titleBorderPattern ??= "light";

  // Set the title border edges.
  link.titleBorderEdges ??= "straight";

  // Set the title opacity.
  link.titleOpacity ??= 1;

  // Set the patterns.
  link.startPattern ??= "none";
  link.middlePattern ??= "solid-line";
  link.endPattern ??= "solid-arrow";

  // Set the opacity.
  link.opacity ??= 1;

  // Set system A.
  link.systemA = getSubsystemById(system, link.a)!;

  // Set system B.
  link.systemB = getSubsystemById(system, link.b)!;
}
