import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

function isBool(e: t.Expression): boolean | undefined {
  if (t.isBooleanLiteral(e)) return e.value;
  if (t.isNullLiteral(e)) return false;
  return undefined;
}

const whileDoSimplify: Transform = {
  name: 'whileDoSimplify',
  description: '简化while和do-while循环',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    traverse(ast, {
      WhileStatement(path) {
        const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
        if (v === false) { path.remove(); changed = true; }
      },
      DoWhileStatement(path) {
        const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
        if (v === false) {
          const b = path.node.body;
          if (t.isBlockStatement(b)) path.replaceWithMultiple(b.body);
          else path.replaceWith(b);
          changed = true;
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default whileDoSimplify;


