import type { DeobfuscateOptions, Transform } from '../types';

function match(name: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((p) => (p.endsWith('/*') ? name.startsWith(p.slice(0, -2)) : name === p));
}

export function filterTransforms(all: Transform[], opts: DeobfuscateOptions): Transform[] {
  const { include, exclude, pipeline } = opts;
  let list = all
    .filter((t) => t.enabledByDefault ?? true)
    .filter((t) => (include ? match(t.name, include) : true))
    .filter((t) => (exclude ? !match(t.name, exclude) : true));

  if (pipeline && pipeline.length > 0) {
    // 使用外部提供的顺序，未列出的模块排在最后按 phase 排序
    const order = new Map(pipeline.map((n, i) => [n, i] as const));
    list = list.sort((a, b) => {
      const ia = order.has(a.name) ? (order.get(a.name) as number) : Number.MAX_SAFE_INTEGER;
      const ib = order.has(b.name) ? (order.get(b.name) as number) : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return (a.phase ?? 0) - (b.phase ?? 0);
    });
  } else {
    list = list.sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0));
  }

  return list;
}


