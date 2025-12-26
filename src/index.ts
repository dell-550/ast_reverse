#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { deobfuscate } from './core/deobfuscator';

// 导出核心功能
export { parse as parseCode, print as generateCode } from './core/parser';
export {
  Deobfuscator,
  createDeobfuscator,
  deobfuscate,
  TransformRegistry,
} from './core/deobfuscator';
export * from './types';

// 命令行入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputFilePath = './src/work/inputs/demo.js';

  if (!fs.existsSync(inputFilePath)) {
    console.error('文件不存在:', inputFilePath);
    process.exit(1);
  }

  const inputCode = fs.readFileSync(inputFilePath, 'utf-8');
  const fileName = path.basename(inputFilePath, path.extname(inputFilePath));
  const outputFilePath = inputFilePath.replace('inputs', 'outputs');

  console.log('开始解混淆...');
  console.log('输入:', inputFilePath);

  try {
    const result = deobfuscate(inputCode, ['ternaryToIfElse'], outputFilePath);

    console.log('完成');
    console.log('应用变换:', result.appliedCount, '个');
    console.log('输出:', result.outputPath);
  } catch (error: any) {
    console.error('失败:', error.message);
    process.exit(1);
  }
}
