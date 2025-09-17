// 导出所有变换模块
import sequenceFlatten from './others/sequenceFlatten';
import binaryFold from './expressions/binaryFold';
import ifElseSimplify from './control/ifElseSimplify';
import forSimplify from './loops/forSimplify';
import whileDoSimplify from './loops/whileDoSimplify';

// Switch语句处理
import switchSimplify from './switch/switchSimplify';
import switchDeobfuscator from './switch/switchDeobfuscator';
import stateMachineSimplifier from './switch/stateMachineSimplifier';

import stringDecoder from './strings/stringDecoder';
import arrayFlattener from './arrays/arrayFlattener';
import deadCodeElimination from './optimization/deadCodeElimination';

// 变量处理
import variableRenamer from './variables/variableRenamer';
import variableCleaner from './variables/variableCleaner';

// 基础清理模块
import basicCleaner from './basic/basicCleaner';

// 新增的解混淆模块
import controlFlowFlattening from './control/controlFlowFlattening';
import expressionSimplifier from './expressions/expressionSimplifier';
import numberFormatter from './expressions/numberFormatter';
import propertyAccessOptimizer from './expressions/propertyAccessOptimizer';
import commaExpressionSplitter from './expressions/commaExpressionSplitter';

export const ALL_TRANSFORMS = [
  // 基础清理 - 最先执行
  basicCleaner,
  
  // 逗号表达式拆分 - 早期执行以简化后续处理
  commaExpressionSplitter,
  
  // 字符串解码 - 优先处理
  stringDecoder,
  
  // 数字格式化 - 早期处理
  numberFormatter,
  
  // 表达式简化 - 在控制流处理前
  expressionSimplifier,
  binaryFold,
  
  // 属性访问优化
  propertyAccessOptimizer,
  
  // 控制流简化 - 核心解混淆
  controlFlowFlattening,
  sequenceFlatten,
  ifElseSimplify,
  forSimplify,
  whileDoSimplify,
  stateMachineSimplifier,
  switchDeobfuscator,
  switchSimplify,
  
  // 数组处理
  arrayFlattener,
  
  // 优化 - 后期处理
  deadCodeElimination,
  
  // 变量重命名 - 最后处理
  variableCleaner,
  variableRenamer
];


