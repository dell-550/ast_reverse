import * as fs from 'fs';
import * as path from 'path';
import { Transform, TransformContext, TransformResult } from '../types';
import { TransformRegistry } from './transformRegistry';

/**
 * 统一的解混淆器
 * 支持注册和动态加载transform模块，保持可扩展性
 */
export class Deobfuscator {
  private transforms: Transform[] = [];

  /**
   * 注册一个transform模块
   */
  register(transform: Transform): void {
    this.transforms.push(transform);
  }

  /**
   * 注册多个transform模块
   */
  registerAll(transforms: Transform[]): void {
    this.transforms.push(...transforms);
  }

  /**
   * 根据名称注册transform模块
   */
  registerByName(name: string): boolean {
    const transform = TransformRegistry.get(name);
    if (transform) {
      this.transforms.push(transform);
      return true;
    }
    return false;
  }

  /**
   * 根据名称列表注册多个transform模块
   */
  registerByNames(names: string[]): void {
    const transforms = TransformRegistry.getMany(names);
    this.transforms.push(...transforms);
  }

  /**
   * 清空所有已注册的transform模块
   */
  clear(): void {
    this.transforms = [];
  }

  /**
   * 获取所有已注册的transform模块
   */
  getTransforms(): Transform[] {
    return [...this.transforms];
  }

  /**
   * 执行解混淆
   */
  run(
    code: string,
    context?: TransformContext
  ): { code: string; appliedCount: number } {
    let currentCode = code;
    let appliedCount = 0;

    for (const transform of this.transforms) {
      const result: TransformResult = transform.run(currentCode, context);
      if (result.changed) {
        currentCode = result.code;
        appliedCount++;
      }
    }

    return { code: currentCode, appliedCount };
  }
}

/**
 * 创建默认配置的解混淆器
 * @param transformNames - transform模块名称列表，如果为空则使用默认模块
 * @param transforms - 直接传入的Transform对象列表（可选，优先级高于名称）
 */
export function createDeobfuscator(
  transformNames?: string[]
  // transforms?: Transform[]
): Deobfuscator {
  const deobfuscator = new Deobfuscator();

  if (transformNames && transformNames.length > 0) {
    deobfuscator.registerByNames(transformNames);
  }
  // 否则使用默认模块
  else {
    console.log('使用默认模块');
    const defaultTransforms = TransformRegistry.getDefault();
    deobfuscator.registerAll(defaultTransforms);
  }

  return deobfuscator;
}

/**
 * 解混淆入口函数
 * @param inputCode - 输入的混淆代码
 * @param transformNames - transform模块名称列表（可选）
 * @param outputFileName - 输出文件名（可选）
 */
export function deobfuscate(
  inputCode: string,
  transformNames?: string[],
  outputFilePath?: string
): { code: string; appliedCount: number; outputPath: string } {
  const deobfuscator = createDeobfuscator(transformNames);
  const result = deobfuscator.run(inputCode);

  // // 确保输出目录存在
  // const outputDir = './work/outputs';
  // if (!fs.existsSync(outputDir)) {
  //   fs.mkdirSync(outputDir, { recursive: true });
  // }

  const finalOutputFilePath =
    outputFilePath || './src/work/outputs/deobfuscated.js';
  const outputPath = finalOutputFilePath;
  fs.writeFileSync(outputPath, result.code, 'utf-8');

  return {
    code: result.code,
    appliedCount: result.appliedCount,
    outputPath: outputPath,
  };
}

/**
 * 导出TransformRegistry，方便外部使用
 */
export { TransformRegistry };
