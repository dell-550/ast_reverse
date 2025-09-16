import { print } from './parser';
import type { File } from '@babel/types';
import type { DeobfuscateOptions, Transform } from '../types';

export function runPipeline(ast: File, transforms: Transform[], options: DeobfuscateOptions) {
  const maxPasses = options.maxPasses ?? 3;
  const applied: string[] = [];

  for (let pass = 1; pass <= maxPasses; pass++) {
    let passEdits = 0;
    for (const tr of transforms) {
      const before = print(ast);
      const { edits } = tr.run(ast, { options });
      const after = print(ast);
      if (edits > 0 || before !== after) {
        applied.push(`${tr.name}@${pass}+${edits}`);
        passEdits += edits;
      }
    }
    if (passEdits === 0) break;
  }

  return { ast, applied };
}


