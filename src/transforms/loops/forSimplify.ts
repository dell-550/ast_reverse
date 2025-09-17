import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

function isFalse(expr: t.Expression | null | undefined): boolean {
  if (!expr) return false;
  if (t.isBooleanLiteral(expr)) return expr.value === false;
  if (t.isNumericLiteral(expr)) return expr.value === 0 || Number.isNaN(expr.value);
  if (t.isNullLiteral(expr)) return true;
  return false;
}

const forSimplify: Transform = {
  name: 'forSimplify',
  description: '简化 for 循环',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    traverse(ast, {
      ForStatement(path) {
        const { test, body } = path.node;
        if (t.isBlockStatement(body) && body.body.length === 0) {
          const repl: t.Statement[] = [];
          if (path.node.init) repl.push(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
          path.replaceWithMultiple(repl);
          changed = true;
          return;
        }
        if (test && isFalse(test)) {
          if (path.node.init) path.replaceWith(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
          else path.remove();
          changed = true;
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default forSimplify;


