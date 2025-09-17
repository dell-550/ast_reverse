import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

const deadCodeElimination: Transform = {
  name: 'deadCodeElimination',
  description: '移除死代码',
  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    
    // 简单的死代码消除：移除永远不会执行的代码
    traverse(ast, {
      IfStatement(path) {
        const test = path.node.test;
        if (t.isBooleanLiteral(test) && test.value === false) {
          // 移除永远不会执行的if语句
          path.remove();
          changed = true;
          context?.debug?.('移除永远不会执行的if语句');
        }
      },
      // 移除空的表达式语句
      ExpressionStatement(path) {
        if (t.isSequenceExpression(path.node.expression) && 
            path.node.expression.expressions.length === 0) {
          path.remove();
          changed = true;
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default deadCodeElimination;