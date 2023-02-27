type LogArgs = [string, ...any[]];

interface LogBindConfig {
  method: keyof typeof console;
  args: LogArgs;
}
type LevelPlugin<
  THook extends string = string,
  TLevel extends string = string,
  TModifier extends string = string
> = {
  [key in THook]: (
    bindConfig: LogBindConfig,
    bindOptions: { level: TLevel; modifier?: TModifier }
  ) => LogBindConfig | null;
};
type ModifierPlugin<
  THook extends string = string,
  TLevel extends string = string,
  TModifier extends string = string
> = {
  [key in THook]: (
    bindConfig: LogBindConfig,
    bindOptions: { level: TLevel; modifier?: TModifier }
  ) => LogBindConfig | null;
};

interface LogFn {
  (...args: LogArgs): () => void;
}
type ModifierMap<TModifier extends string> = {
  [key in TModifier]: LogFn;
};
type Logger<TLevel extends string, TModifier extends string> = {
  [key in TLevel]: ModifierMap<TModifier> & LogFn;
};

/**
 * Creates a logger object that has methods defined by the level and modifier plugin methods.
 *
 * A level plugin is an object with methods that take and return an object with `method`
 * and `args` properties.
 *
 *
 *
 * The method property is key of the console object and declares what console method to call.
 *
 * The args property is an array of arguments to pass to the selected console method.
 */
export function createLogger<
  TLevel extends string,
  TModifier extends string
>(options: {
  levels: LevelPlugin<TLevel>[];
  modifiers: ModifierPlugin<TModifier>[];
}): Logger<TLevel, TModifier> {
  const levels = new Set(options.levels.flatMap((p) => Object.keys(p)));
  const isLevel = (x: unknown): x is TLevel => {
    return typeof x === "string" && levels.has(x);
  };

  const modifiers = new Set(options.modifiers.flatMap((p) => Object.keys(p)));
  const isModifier = (x: unknown): x is TModifier => {
    return typeof x === "string" && modifiers.has(x);
  };

  const logger = new Proxy({} as Logger<TLevel, TModifier>, {
    get(target, level, receiver) {
      if (isLevel(level)) {
        const modifierMap = new Proxy(
          () => undefined as unknown as ModifierMap<TModifier>,
          {
            apply(_target, _thisArg, argArray) {
              return applyPlugins({ level, args: argArray as LogArgs });
            },
            get(target, modifier, receiver) {
              if (isModifier(modifier)) {
                return (...args: LogArgs) =>
                  applyPlugins({
                    level,
                    modifier,
                    args,
                  });
              } else {
                return Reflect.get(target, modifier, receiver);
              }
            },
          }
        );
        return modifierMap;
      } else {
        return Reflect.get(target, level, receiver);
      }
    },
  });
  return logger;

  function applyPlugins({
    level,
    modifier,
    args,
  }: {
    level: TLevel;
    modifier?: TModifier;
    args: LogArgs;
  }): () => void {
    let config: LogBindConfig | null = {
      method: level in console ? (level as LogBindConfig["method"]) : "debug",
      args,
    };

    for (const levelPlugin of options.levels) {
      if (config) {
        config = levelPlugin?.[level](config, { level, modifier });
      } else {
        break;
      }
    }

    if (config && typeof modifier === "string") {
      for (const modPlugin of options.modifiers) {
        if (config) {
          config = modPlugin?.[modifier](config, { level, modifier });
        } else {
          break;
        }
      }
    }

    if (config) {
      const method = globalThis.console[config.method];
      // bind console method to get
      return method.bind(globalThis.console, ...config.args);
    } else {
      // silence log
      return () => undefined;
    }
  }
}