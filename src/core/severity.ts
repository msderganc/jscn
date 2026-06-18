export const severityLevels = ["info", "warning", "error", "critical"] as const;

export type Severity = (typeof severityLevels)[number];

export function isSeverity(value: string): value is Severity {
  return severityLevels.includes(value as Severity);
}
