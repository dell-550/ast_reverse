import { Transform } from '../types';

// 导入所有transform模块
import ternaryToIfElse from '../transforms/control/ternaryToIfElse';
import hexStringDecoder from '../transforms/strings/hexStringDecoder';
import stringArrayResolver from '../transforms/strings/stringArrayResolver';
import wrapperFunctionInliner from '../transforms/expressions/wrapperFunctionInliner';
import jsFuckDecoder from '../transforms/expressions/jsFuckDecoder';
import propertyAccessSimplifier from '../transforms/expressions/propertyAccessSimplifier';

// import stringDecoder from '../transforms/strings/stringDecoder';
// import arrayFlattener from '../transforms/arrays/arrayFlattener';
// import sequenceFlatten from '../transforms/others/sequenceFlatten';
// import binaryFold from '../transforms/expressions/binaryFold';
// import ifElseSimplify from '../transforms/control/ifElseSimplify';
// import forSimplify from '../transforms/loops/forSimplify';
// import whileDoSimplify from '../transforms/loops/whileDoSimplify';
// import switchSimplify from '../transforms/switch/switchSimplify';
// import switchDeobfuscator from '../transforms/switch/switchDeobfuscator';
// import stateMachineSimplifier from '../transforms/switch/stateMachineSimplifier';
// import deadCodeElimination from '../transforms/optimization/deadCodeElimination';
// import variableRenamer from '../transforms/variables/variableRenamer';
// import variableCleaner from '../transforms/variables/variableCleaner';
// import basicCleaner from '../transforms/basic/basicCleaner';
// import controlFlowFlattening from '../transforms/control/controlFlowFlattening';
// import expressionSimplifier from '../transforms/expressions/expressionSimplifier';
// import numberFormatter from '../transforms/expressions/numberFormatter';
// import propertyAccessOptimizer from '../transforms/expressions/propertyAccessOptimizer';
// import commaExpressionSplitter from '../transforms/expressions/commaExpressionSplitter';

/**
 * Transform模块注册表
 * 统一管理所有可用的transform模块
 */
export class TransformRegistry {
  private static transforms: Map<string, Transform> = new Map();

  /**
   * 初始化注册表，注册所有transform模块
   */
  static initialize(): void {
    // 控制流处理
    this.register('ternaryToIfElse', ternaryToIfElse);

    // 字符串处理
    this.register('hexStringDecoder', hexStringDecoder);
    this.register('stringArrayResolver', stringArrayResolver);

    // 表达式处理
    this.register('jsFuckDecoder', jsFuckDecoder);
    this.register('wrapperFunctionInliner', wrapperFunctionInliner);
    this.register('propertyAccessSimplifier', propertyAccessSimplifier);

    // 数组处理
    // this.register('arrayFlattener', arrayFlattener);

    // 表达式处理
    // this.register('binaryFold', binaryFold);
    // this.register('expressionSimplifier', expressionSimplifier);
    // this.register('numberFormatter', numberFormatter);
    // this.register('propertyAccessOptimizer', propertyAccessOptimizer);
    // this.register('commaExpressionSplitter', commaExpressionSplitter);

    // 控制流处理
    // this.register('ifElseSimplify', ifElseSimplify);
    // this.register('controlFlowFlattening', controlFlowFlattening);

    // 循环处理
    // this.register('forSimplify', forSimplify);
    // this.register('whileDoSimplify', whileDoSimplify);

    // Switch处理
    // this.register('switchSimplify', switchSimplify);
    // this.register('switchDeobfuscator', switchDeobfuscator);
    // this.register('stateMachineSimplifier', stateMachineSimplifier);

    // 其他处理
    // this.register('sequenceFlatten', sequenceFlatten);

    // 优化
    // this.register('deadCodeElimination', deadCodeElimination);

    // 变量处理
    // this.register('variableRenamer', variableRenamer);
    // this.register('variableCleaner', variableCleaner);

    // 基础清理
    // this.register('basicCleaner', basicCleaner);
  }

  /**
   * 注册一个transform模块
   */
  static register(name: string, transform: Transform): void {
    this.transforms.set(name, transform);
  }

  /**
   * 根据名称获取transform模块
   */
  static get(name: string): Transform | undefined {
    return this.transforms.get(name);
  }

  /**
   * 根据名称列表获取多个transform模块
   */
  static getMany(names: string[]): Transform[] {
    return names
      .map((name) => this.get(name))
      .filter((t): t is Transform => t !== undefined);
  }

  /**
   * 获取所有已注册的transform模块名称
   */
  static getAllNames(): string[] {
    return Array.from(this.transforms.keys());
  }

  /**
   * 获取所有已注册的transform模块
   */
  static getAll(): Transform[] {
    return Array.from(this.transforms.values());
  }

  /**
   * 获取默认的transform模块列表（核心模块）
   */
  static getDefault(): Transform[] {
    return [
      hexStringDecoder,          // step 1: \x41\x42 → "AB"
      jsFuckDecoder,             // step 2: +!+[] → 1, [+!+[]]+[+[]] → "10"
      wrapperFunctionInliner,    // step 3: XS(a,b) → a/b
      stringArrayResolver,       // step 4: dB[n] → plaintext (XOR decode via vm)
      propertyAccessSimplifier,  // step 5: obj["prop"] → obj.prop
    ];
  }
}

// 自动初始化
TransformRegistry.initialize();
