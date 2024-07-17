import { State } from "./state.js";

export default interface Operation {
  id: string;
  setup: (state: State) => void;
  onPointerMove: (state: State) => void;
  onPointerDown: (state: State) => void;
  onPointerUp: (state: State) => void;
  onBegin: (state: State) => void;
  onEnd: (state: State) => void;
  onMute: (state: State) => void;
  onUnmute: (state: State) => void;

  onTick?: (state: State) => void;
  onClick?: (state: State) => void;
  onKeyDown?: (state: State, event: KeyboardEvent) => boolean;
}
