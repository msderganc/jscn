import type { SourcePosition } from "../core/source-position.js";

export interface LineMap {
  lineStarts: number[];
  positionAt(offset: number): SourcePosition;
  offsetAt(position: SourcePosition): number;
}

export function createLineMap(text: string): LineMap {
  const lineStarts = [0];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return {
    lineStarts,
    positionAt(offset: number): SourcePosition {
      const bounded = Math.max(0, Math.min(offset, text.length));
      let low = 0;
      let high = lineStarts.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const start = lineStarts[mid] ?? 0;
        const next = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;

        if (bounded < start) {
          high = mid - 1;
        } else if (bounded >= next) {
          low = mid + 1;
        } else {
          return { line: mid + 1, column: bounded - start + 1 };
        }
      }

      return { line: 1, column: 1 };
    },
    offsetAt(position: SourcePosition): number {
      const lineIndex = Math.max(0, Math.min(position.line - 1, lineStarts.length - 1));
      const start = lineStarts[lineIndex] ?? 0;
      const next = lineStarts[lineIndex + 1] ?? text.length + 1;
      return Math.max(start, Math.min(start + position.column - 1, next - 1));
    },
  };
}
