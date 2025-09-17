import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

function truthy(e: t.Expression): boolean | undefined {
  if (t.isBooleanLiteral(e)) return e.value;
  if (t.isNullLiteral(e)) return false;
  if (t.isNumericLiteral(e)) return e.value !== 0 && !Number.isNaN(e.value);
  if (t.isStringLiteral(e)) return e.value.length > 0;
  return undefined;
}

const ifElseSimplify: Transform = {
  name: 'ifElseSimplify',
  description: '简化if-else语句',
  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    traverse(ast, {
      IfStatement(path) {
        const { test, consequent, alternate } = path.node;
        if (!t.isExpression(test)) return;
        const v = truthy(test);
        if (v === true) {
          if (t.isBlockStatement(consequent)) path.replaceWithMultiple(consequent.body);
          else path.replaceWith(consequent);
          changed = true;
        } else if (v === false) {
          if (alternate) {
            if (t.isBlockStatement(alternate)) path.replaceWithMultiple(alternate.body);
            else path.replaceWith(alternate);
          } else {
            path.remove();
          }
          changed = true;
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default ifElseSimplify;


