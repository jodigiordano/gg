import { State } from "./state.js";

export default interface Operation {
  id: string;
  setup: (state: State) => void;
  onPointerMove: (state: State) => void;
  onPointerDown: (state: State) => void;
  onPointerUp: (state: State) => void;
  onPointerDoublePress: (state: State) => void;
  onBegin: (state: State) => void;
  onEnd: (state: State) => void;
  onPointerLeave: (state: State) => void;
  onPointerEnter: (state: State) => void;
  onKeyDown: (state: State, event: KeyboardEvent) => void;
  onEvent: (state: State, event: CustomEvent) => void;
  onWindowPointerMove: (state: State) => void;
  onWindowPointerUp: (state: State) => void;
}
