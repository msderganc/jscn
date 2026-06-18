import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function writeReport(path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
