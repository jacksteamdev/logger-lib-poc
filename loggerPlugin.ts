import { ResolvedConfig, Plugin } from "vite";
import { init, parse, ImportSpecifier } from "es-module-lexer";
import { findNodeAround, simple, Found, findNodeAfter } from "acorn-walk";
import MagicString from "magic-string";

export function loggerPlugin({
  loggerConfigFile: loggerConfigPath,
}: {
  /** Relative path from project root to logger config file */
  loggerConfigFile: string;
}): Plugin {
  let config: ResolvedConfig;
  return {
    name: "logger-call",
    enforce: "post",
    configResolved(_config) {
      config = _config;
    },
    async buildStart() {
      await init;
    },
    async transform(code, id) {
      // find logger module import
      const [imports] = parse(code);
      let loggerImport: ImportSpecifier | undefined;
      for (const i of imports) {
        if (typeof i.n === "string") {
          const imported = await this.resolve(i.n, id);
          if (imported?.id.slice(config.root.length) === loggerConfigPath) {
            loggerImport = i;
            break;
          }
        }
      }
      if (typeof loggerImport === "undefined") return code;

      // if logger is used, parse the code into an ast
      const tree = this.parse(code);
      // find the import statement node
      const loggerNode = findNodeAround(tree, loggerImport.ss);
      if (typeof loggerNode === "undefined") return code;

      const loggerSpecifiers = new Set<string>();
      // walk the import statement node to get the exported logger name
      simple(loggerNode.node, {
        ImportSpecifier(node) {
          loggerSpecifiers.add(node.local.name);
        },
      });

      // find all logger call expression nodes
      const foundNodes = new Set<Found<unknown>>();
      for (const specifier of loggerSpecifiers) {
        for (const { index = 0 } of code.matchAll(new RegExp(specifier, "g"))) {
          if (index > loggerImport.se) {
            const found = findNodeAfter(tree, index);
            if (found) foundNodes.add(found);
          }
        }
      }
      if (!foundNodes.size) return code;

      // add a function call to the end of each logger call expression
      const magic = new MagicString(code);
      for (const { node } of foundNodes) {
        if (
          node.expression.type === "CallExpression" &&
          node.expression.callee.type === "MemberExpression"
        ) {
          magic.prependLeft(node.expression.end, "()");
        }
      }

      // return the modified code and updated sourcemap
      return {
        code: magic.toString(),
        map: magic.generateMap(),
      };
    },
  };
}
