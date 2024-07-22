import { Link, System, Subsystem, Flow, FlowStep } from "./specification.js";

export interface RuntimeSize {
  width: number;
  height: number;
}

export interface RuntimePosition {
  x: number;
  y: number;
}

export interface RuntimePort extends RuntimePosition {}

export interface RuntimeLink extends Link {
  specification: Link;
  index: number;
  systemA: RuntimeSubsystem;
  systemB: RuntimeSubsystem;
}

export interface RuntimeSubsystem extends Subsystem {
  specification: Subsystem;
  title: string;
  titlePosition: RuntimePosition;
  titleSize: RuntimeSize;
  index: number;
  size: RuntimeSize;
  position: RuntimePosition;
  ports: RuntimePort[];
  parent?: RuntimeSystem | RuntimeSubsystem;
  hideSystems: boolean;
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
  hideSystems: false;
  systems: RuntimeSubsystem[];
  links: RuntimeLink[];
  flows: RuntimeFlow[];
  depth: 0;
}

export interface RuntimeFlowStep extends FlowStep {
  specification: FlowStep;
  index: number;
  systemFrom: RuntimeSubsystem;
  systemTo: RuntimeSubsystem;
  links: RuntimeLink[];
}

export interface RuntimeFlow extends Flow {
  specification: Flow;
  index: number;
  steps: RuntimeFlowStep[];
}
