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
    const result = deobfuscate(
      inputCode,
      [
        'hexStringDecoder',         // step 1: 解码 \x41\x42 十六进制字面量
        'jsFuckDecoder',            // step 2: 折叠 +!+[]、[+!+[]]+[+[]] 等常量
        'wrapperFunctionInliner',   // step 3: 内联 XS(a,b)→a/b 等运算符包装
        'stringArrayResolver',      // step 4: vm 沙箱 XOR 解码 dB 字符串数组
        'propertyAccessSimplifier', // step 5: obj["prop"] → obj.prop
      ],
      outputFilePath,
    );

    console.log('完成');
    console.log('应用变换:', result.appliedCount, '个');
    console.log('输出:', result.outputPath);
  } catch (error: any) {
    console.error('失败:', error.message);
    process.exit(1);
  }
}
