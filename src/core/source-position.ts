export interface SourcePosition {
  line: number;
  column: number;
}

interface SourceRange {
  start: SourcePosition;
  end?: SourcePosition;
}
