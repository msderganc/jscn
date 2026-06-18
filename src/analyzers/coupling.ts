import type { CouplingReport, DependencyReport, Issue } from "../core/schema.js";

interface ModuleCoupling {
  file: string;
  fanIn: number;
  fanOut: number;
}

export function analyzeCoupling(dependencies: DependencyReport): CouplingReport {
  const modules = new Map<string, ModuleCoupling>();
  for (const edge of dependencies.edges.filter((item) => item.resolved && !item.external)) {
    const from = modules.get(edge.from) ?? { file: edge.from, fanIn: 0, fanOut: 0 };
    const to = modules.get(edge.to) ?? { file: edge.to, fanIn: 0, fanOut: 0 };
    from.fanOut += 1;
    to.fanIn += 1;
    modules.set(from.file, from);
    modules.set(to.file, to);
  }
  return { modules: [...modules.values()].sort((a, b) => a.file.localeCompare(b.file)), classes: [] };
}

export function couplingIssues(report: CouplingReport): Issue[] {
  return (report.modules as ModuleCoupling[])
    .filter((item) => item.fanOut > 10)
    .map((item) => ({
      id: `coupling:module:${item.file}`,
      analyzer: "coupling",
      severity: "warning" as const,
      message: `High module fan-out: ${item.fanOut}`,
      file: item.file,
      rule: "coupling.fan_out",
      details: { ...item },
    }));
}
