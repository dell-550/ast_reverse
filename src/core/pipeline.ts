import { print } from './parser';
import * as fs from 'fs';
import * as path from 'path';
import type { File } from '@babel/types';
import type { DeobfuscateOptions, Transform } from '../types';

export function runPipeline(ast: File, transforms: Transform[], options: DeobfuscateOptions) {
  const maxPasses = options.maxPasses ?? 3;
  const applied: string[] = [];
  const snapshotDir = options.snapshotDir;
  if (snapshotDir) fs.mkdirSync(snapshotDir, { recursive: true });

  for (let pass = 1; pass <= maxPasses; pass++) {
    let passEdits = 0;
    for (const tr of transforms) {
      const before = print(ast);
      const { edits } = tr.run(ast, { options });
      const after = print(ast);
      if (edits > 0 || before !== after) {
        applied.push(`${tr.name}@${pass}+${edits}`);
        if (snapshotDir) {
          const fileName = `${String(pass).padStart(2, '0')}-${tr.name.replace(/\//g, '_')}.js`;
          const outPath = path.join(snapshotDir, fileName);
          fs.writeFileSync(outPath, after, 'utf-8');
        }
        passEdits += edits;
      }
    }
    if (passEdits === 0) break;
  }

  return { ast, applied };
}


