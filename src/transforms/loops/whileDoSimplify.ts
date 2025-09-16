import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../../types';

function isBool(e: t.Expression): boolean | undefined {
  if (t.isBooleanLiteral(e)) return e.value;
  if (t.isNullLiteral(e)) return false;
  return undefined;
}

const whileDoSimplify: Transform = {
  name: 'loops/whileDoSimplify',
  description: '移除 while(false) 与展开 do{...}while(false)',
  phase: 31,
  enabledByDefault: true,
  run(ast) {
    let edits = 0;
    traverse(ast, {
      WhileStatement(path) {
        const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
        if (v === false) { path.remove(); edits++; }
      },
      DoWhileStatement(path) {
        const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
        if (v === false) {
          const b = path.node.body;
          if (t.isBlockStatement(b)) path.replaceWithMultiple(b.body);
          else path.replaceWith(b);
          edits++;
        }
      }
    });
    return { edits };
  }
};

export default whileDoSimplify;


