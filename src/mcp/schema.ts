export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface HealthScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  inputs: {
    critical: number;
    error: number;
    warning: number;
    cycleCount: number;
    highComplexityCount: number;
  };
}
