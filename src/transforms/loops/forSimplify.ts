import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../../types';

function isFalse(expr: t.Expression | null | undefined): boolean {
  if (!expr) return false;
  if (t.isBooleanLiteral(expr)) return expr.value === false;
  if (t.isNumericLiteral(expr)) return expr.value === 0 || Number.isNaN(expr.value);
  if (t.isNullLiteral(expr)) return true;
  return false;
}

const forSimplify: Transform = {
  name: 'loops/forSimplify',
  description: '移除恒假 for 或空体 for',
  phase: 30,
  enabledByDefault: true,
  run(ast) {
    let edits = 0;
    traverse(ast, {
      ForStatement(path) {
        const { test, body } = path.node;
        if (t.isBlockStatement(body) && body.body.length === 0) {
          const repl: t.Statement[] = [];
          if (path.node.init) repl.push(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
          path.replaceWithMultiple(repl);
          edits++;
          return;
        }
        if (test && isFalse(test)) {
          if (path.node.init) path.replaceWith(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
          else path.remove();
          edits++;
        }
      }
    });
    return { edits };
  }
};

export default forSimplify;


