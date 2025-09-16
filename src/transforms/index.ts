import sequenceFlatten from './others/sequenceFlatten';
import binaryFold from './expressions/binaryFold';
import ifElseSimplify from './control/ifElseSimplify';
import forSimplify from './loops/forSimplify';
import whileDoSimplify from './loops/whileDoSimplify';
import switchSimplify from './switch/switchSimplify';

export const ALL_TRANSFORMS = [
  sequenceFlatten,
  binaryFold,
  ifElseSimplify,
  forSimplify,
  whileDoSimplify,
  switchSimplify,
];


