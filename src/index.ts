#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { parse, print } from './core/parser';
import { runPipeline } from './core/pipeline';
import { filterTransforms } from './core/registry';
import { ALL_TRANSFORMS } from './transforms';
import type { DeobfuscateOptions } from './types';

export function deobfuscate(code: string, options: DeobfuscateOptions = {}) {
  const ast = parse(code);
  const selected = filterTransforms(ALL_TRANSFORMS, options);
  const { ast: out, applied } = runPipeline(ast, selected, options);
  return { code: print(out), applied };
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const input = args[0];
  if (!input) {
    console.error('Usage: node dist/index.js <input.js>');
    process.exit(1);
  }

  const raw = fs.readFileSync(input, 'utf-8');
  const options: DeobfuscateOptions = {};
  const { code } = deobfuscate(raw, options);

  const parsed = path.parse(input);
  const outFile = path.join('./work/outputs', `${parsed.name}.out${parsed.ext || '.js'}`);
  fs.writeFileSync(outFile, code, 'utf-8');
}


