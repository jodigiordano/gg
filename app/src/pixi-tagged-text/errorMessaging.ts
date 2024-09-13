import * as PIXI from "pixi.js";
import { ErrorHandler, ErrorMessage, ErrorMessageType } from "./types.js";

const log =
  (type: ErrorMessageType) =>
  (handler?: ErrorHandler, supressConsole = false, target?: PIXI.Sprite) =>
  (code: string, message: string): void => {
    if (supressConsole !== true) {
      const method = type === "warning" ? console.warn : console.error;
      method(`[${code}] ${message}`);
    }
    if (handler) {
      handler({ target, code, message, type } as ErrorMessage);
    }
  };

export const logWarning = log("warning");
export const logError = log("error");
