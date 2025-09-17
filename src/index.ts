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
  const pipelineEnv = process.env.AST_PIPELINE; // 逗号分隔的变换名
  const snapshotEnv = process.env.SNAPSHOT_DIR; // 指定中间产物目录
  const getArg = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const snapshotArg = getArg('--snapshots');
  const options: DeobfuscateOptions = {
    pipeline: pipelineEnv ? pipelineEnv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    snapshotDir: snapshotArg || snapshotEnv,
  };
  const { code } = deobfuscate(raw, options);

  const parsed = path.parse(input);
  const outDir = path.join('.', 'work', 'outputs');
  ensureDir(outDir);
  const outFile = path.join(outDir, `${parsed.name}.out${parsed.ext || '.js'}`);
  fs.writeFileSync(outFile, code, 'utf-8');
}


