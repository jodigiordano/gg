import {
  Link,
  System,
  Subsystem,
  PathEndingPattern,
  PathPattern,
  TextFont,
  TextAlign,
} from "./specification.js";

export interface RuntimeSize {
  width: number;
  height: number;
}

export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimeLink extends Link {
  specification: Link;
  index: number;
  title: string;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  titleFont: TextFont;
  titleAlign: TextAlign;
  startPattern: PathEndingPattern;
  endPattern: PathEndingPattern;
  middlePattern: PathPattern;
  systemA: RuntimeSubsystem;
  systemB: RuntimeSubsystem;
}

export interface RuntimeSubsystem extends Subsystem {
  specification: Subsystem;
  title: string;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  titleFont: TextFont;
  titleAlign: TextAlign;
  index: number;
  size: RuntimeSize;
  position: RuntimePosition;
  parent?: RuntimeSystem | RuntimeSubsystem;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  depth: number;
}

export interface RuntimeSystem extends System {
  specification: System;
  id: undefined;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  size: RuntimeSize;
  position: RuntimePosition;
  parent?: undefined;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  depth: 0;
}
