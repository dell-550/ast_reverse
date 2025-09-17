#!/usr/bin/env node

// AST解混淆模块库
// 提供独立的解混淆模块，开发者可以自定义调用

import * as fs from 'fs';
import * as path from 'path';

export { parse as parseCode, print as generateCode } from './core/parser';

// 导入解混淆模块用于内部使用
import binaryFoldModule from './transforms/expressions/binaryFold';
import ifElseSimplifyModule from './transforms/control/ifElseSimplify';
import sequenceFlattenModule from './transforms/others/sequenceFlatten';
import variableRenamerModule from './transforms/variables/variableRenamer';

// 导出解混淆模块
export { default as stringDecoder } from './transforms/strings/stringDecoder';
export { default as arrayFlattener } from './transforms/arrays/arrayFlattener';
export { default as sequenceFlatten } from './transforms/others/sequenceFlatten';
export { default as binaryFold } from './transforms/expressions/binaryFold';
export { default as ifElseSimplify } from './transforms/control/ifElseSimplify';
export { default as forSimplify } from './transforms/loops/forSimplify';
export { default as whileDoSimplify } from './transforms/loops/whileDoSimplify';
export { default as switchSimplify } from './transforms/switch/switchSimplify';
export { default as deadCodeElimination } from './transforms/optimization/deadCodeElimination';
export { default as variableRenamer } from './transforms/variables/variableRenamer';

// 导出类型定义
export * from './types';

// 简单的工具函数
export function applyTransform(code: string, transform: any): { code: string, changed: boolean } {
  const context = { options: {} };
  return transform.run(code, context);
}

export function applyTransforms(code: string, transforms: any[]): { code: string, appliedCount: number } {
  let currentCode = code;
  let appliedCount = 0;
  
  for (const transform of transforms) {
    const result = applyTransform(currentCode, transform);
    if (result.changed) {
      currentCode = result.code;
      appliedCount++;
    }
  }
  
  return { code: currentCode, appliedCount };
}

// 解混淆入口函数 - 自动保存到outputs目录
export function deobfuscate(inputCode: string, outputFileName?: string): { code: string, appliedCount: number, outputPath: string } {
  // 定义所有可用的变换
  const allTransforms = [
    binaryFoldModule,
    ifElseSimplifyModule,
    sequenceFlattenModule,
    variableRenamerModule
  ];
  
  // 应用所有变换
  const result = applyTransforms(inputCode, allTransforms);
  
  // 确保输出目录存在
  const outputDir = './work/outputs';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 如果没有提供输出文件名，使用默认名称
  const finalOutputFileName = outputFileName || 'deobfuscated.js';
  
  // 保存结果
  const outputPath = path.join(outputDir, finalOutputFileName);
  fs.writeFileSync(outputPath, result.code, 'utf-8');
  
  return {
    code: result.code,
    appliedCount: result.appliedCount,
    outputPath: outputPath
  };
}

// 命令行入口 - 仅在直接运行时执行
if (require.main === module) {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const inputFilePath = args[0];

  if (!inputFilePath) {
    console.log('🚀 AST解混淆框架 - 开发模式');
    console.log('==================================================');
    console.log('❌ 请提供混淆代码文件路径');
    console.log('');
    console.log('使用方法:');
    console.log('  npm run dev <混淆代码文件路径>');
    console.log('');
    console.log('示例:');
    console.log('  npm run dev ./work/inputs/demo.js');
    console.log('  npm run dev /path/to/obfuscated.js');
    console.log('');
    process.exit(1);
  }

  // 检查文件是否存在
  if (!fs.existsSync(inputFilePath)) {
    console.log('❌ 文件不存在:', inputFilePath);
    process.exit(1);
  }

  // 读取输入文件
  const inputCode = fs.readFileSync(inputFilePath, 'utf-8');
  const fileName = path.basename(inputFilePath, path.extname(inputFilePath));
  const outputFileName = `${fileName}_deobfuscated.js`;

  console.log('🚀 AST解混淆框架 - 开发模式');
  console.log('==================================================');
  console.log('📁 输入文件:', inputFilePath);
  console.log('📝 原始代码:');
  console.log(inputCode);
  console.log('');
  console.log('--------------------------------------------------');
  console.log('');
  console.log('🔧 开始解混淆...');

  try {
    const result = deobfuscate(inputCode, outputFileName);
    
    console.log('✅ 解混淆完成!');
    console.log('✓ 应用了', result.appliedCount, '个变换');
    console.log('✓ 结果已保存到:', result.outputPath);
    console.log('');
    console.log('📝 解混淆结果:');
    console.log(result.code);
    console.log('');
    console.log('==================================================');
    console.log('');
    console.log('📚 使用说明:');
    console.log('1. 将混淆代码放入任意位置');
    console.log('2. 使用 npm run dev <文件路径> 进行解混淆');
    console.log('3. 结果会自动保存到 ./work/outputs/ 目录');
    console.log('');
    console.log('🔄 处理其他文件: npm run dev <新文件路径>');
    
  } catch (error: any) {
    console.log('❌ 解混淆失败:', error.message);
    process.exit(1);
  }
}


