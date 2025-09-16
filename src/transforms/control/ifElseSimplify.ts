import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../../types';

function truthy(e: t.Expression): boolean | undefined {
  if (t.isBooleanLiteral(e)) return e.value;
  if (t.isNullLiteral(e)) return false;
  if (t.isNumericLiteral(e)) return e.value !== 0 && !Number.isNaN(e.value);
  if (t.isStringLiteral(e)) return e.value.length > 0;
  return undefined;
}

const ifElseSimplify: Transform = {
  name: 'control/ifElseSimplify',
  description: '简化恒真/恒假的 if 语句',
  phase: 20,
  enabledByDefault: true,
  run(ast) {
    let edits = 0;
    traverse(ast, {
      IfStatement(path) {
        const { test, consequent, alternate } = path.node;
        if (!t.isExpression(test)) return;
        const v = truthy(test);
        if (v === true) {
          if (t.isBlockStatement(consequent)) path.replaceWithMultiple(consequent.body);
          else path.replaceWith(consequent);
          edits++;
        } else if (v === false) {
          if (alternate) {
            if (t.isBlockStatement(alternate)) path.replaceWithMultiple(alternate.body);
            else path.replaceWith(alternate);
          } else {
            path.remove();
          }
          edits++;
        }
      }
    });
    return { edits };
  }
};

export default ifElseSimplify;


