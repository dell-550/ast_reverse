import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../../types';

const sequenceFlatten: Transform = {
  name: 'others/sequenceFlatten',
  description: '表达式语句中的逗号表达式展开为多条语句',
  phase: 5,
  enabledByDefault: true,
  run(ast) {
    let edits = 0;
    traverse(ast, {
      ExpressionStatement(path) {
        const expr = path.node.expression;
        if (t.isSequenceExpression(expr)) {
          const stmts = expr.expressions.map((e) => t.expressionStatement(e));
          path.replaceWithMultiple(stmts);
          edits++;
        }
      },
    });
    return { edits };
  },
};

export default sequenceFlatten;


