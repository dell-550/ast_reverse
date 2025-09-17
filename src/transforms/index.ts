// 导出所有变换模块
import sequenceFlatten from './others/sequenceFlatten';
import binaryFold from './expressions/binaryFold';
import ifElseSimplify from './control/ifElseSimplify';
import forSimplify from './loops/forSimplify';
import whileDoSimplify from './loops/whileDoSimplify';
import switchSimplify from './switch/switchSimplify';
import stringDecoder from './strings/stringDecoder';
import arrayFlattener from './arrays/arrayFlattener';
import deadCodeElimination from './optimization/deadCodeElimination';
import variableRenamer from './variables/variableRenamer';

export const ALL_TRANSFORMS = [
  // 字符串解码
  stringDecoder,
  // 数组处理
  arrayFlattener,
  // 表达式简化
  binaryFold,
  // 控制流简化
  sequenceFlatten,
  ifElseSimplify,
  forSimplify,
  whileDoSimplify,
  switchSimplify,
  // 优化
  deadCodeElimination,
  // 变量重命名
  variableRenamer
];


