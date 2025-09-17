import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

const sequenceFlatten: Transform = {
  name: 'sequenceFlatten',
  description: '展开序列表达式',
  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    traverse(ast, {
      ExpressionStatement(path) {
        const expr = path.node.expression;
        if (t.isSequenceExpression(expr)) {
          const stmts = expr.expressions.map((e) => t.expressionStatement(e));
          path.replaceWithMultiple(stmts);
          changed = true;
        }
      },
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  },
};

export default sequenceFlatten;


