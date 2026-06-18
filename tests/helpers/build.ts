import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let buildPromise: Promise<void> | undefined;

export function ensureBuilt(): Promise<void> {
  buildPromise ??= execFileAsync("node", ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]).then(
    () => undefined
  );
  return buildPromise;
}
