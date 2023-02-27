import { createLogger } from "./lib/createLogger";

export const logger = createLogger({
  // "debug" in logger.debug.red(...)
  levels: [
    {
      debug: ({ method, args }) => {
        // can send logs to server here
        // navigator.sendBeacon('https://call.home/')

        // return { method, args } to log to console
        if (import.meta.env.MODE?.includes("dev")) {
          return { method, args };
        }

        // can silence logs by returning null
        return null;
      },
      log: ({ method, args }) => {
        // can send logs to server here
        // navigator.sendBeacon('https://call.home/')

        return {
          method,
          args,
        };
      },
    },
  ],
  // "red" in logger.debug.red(...)
  modifiers: [
    {
      red: ({ method, args: [label, ...args] }) => {
        // can style logs here
        return {
          method,
          args: [`%c${label}`, "background-color: red; color: white", ...args],
        };
      },
      blue: ({ method, args: [label, ...args] }) => {
        // can style logs here
        return {
          method,
          args: [`%c${label}`, "background-color: blue; color: white", ...args],
        };
      },
    },
  ],
});
