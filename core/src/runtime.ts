import {
  Link,
  System,
  Subsystem,
  PathEndingPattern,
  PathPattern,
  TextFont,
  TextAlign,
  BorderPattern,
  SubsystemType,
} from "./specification.js";

export interface RuntimeSize {
  width: number;
  height: number;
}

export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimeMargin {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
  type: SubsystemType;
  title: string;
  titleSize: RuntimeSize;
  titleFont: TextFont;
  titleAlign: TextAlign;
  titleMargin: RuntimeMargin;
  index: number;
  size: RuntimeSize;
  position: RuntimePosition;
  parent?: RuntimeSystem | RuntimeSubsystem;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  depth: number;
  borderPattern: BorderPattern;
  padding: RuntimeMargin;
  margin: RuntimeMargin;
}

export interface RuntimeSystem extends System {
  specification: System;
  id: undefined;
  type: undefined;
  titleSize: RuntimeSize;
  titleMargin: RuntimeMargin;
  size: RuntimeSize;
  position: RuntimePosition;
  parent?: undefined;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  depth: 0;
  padding: RuntimeMargin;
  margin: RuntimeMargin;
}
