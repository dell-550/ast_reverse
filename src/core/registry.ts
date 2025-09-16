import type { DeobfuscateOptions, Transform } from '../types';

function match(name: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((p) => (p.endsWith('/*') ? name.startsWith(p.slice(0, -2)) : name === p));
}

export function filterTransforms(all: Transform[], opts: DeobfuscateOptions): Transform[] {
  const { include, exclude } = opts;
  return all
    .filter((t) => t.enabledByDefault ?? true)
    .filter((t) => (include ? match(t.name, include) : true))
    .filter((t) => (exclude ? !match(t.name, exclude) : true))
    .sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0));
}


