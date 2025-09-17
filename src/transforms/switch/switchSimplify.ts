import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

function constValue(n: t.Expression): any | undefined {
  if (t.isStringLiteral(n) || t.isNumericLiteral(n) || t.isBooleanLiteral(n)) return n.value;
  if (t.isNullLiteral(n)) return null;
  return undefined;
}

const switchSimplify: Transform = {
  name: 'switchSimplify',
  description: '简化switch语句',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    traverse(ast, {
      SwitchStatement(path) {
        const disc = path.node.discriminant;
        if (!t.isExpression(disc)) return;
        const v = constValue(disc);
        if (v === undefined) return;
        let target: t.SwitchCase | null = null;
        for (const c of path.node.cases) {
          if (!c.test && target === null) target = c;
          else if (c.test && t.isExpression(c.test)) {
            const cv = constValue(c.test);
            if (cv === v) { target = c; break; }
          }
        }
        if (target) {
          const body: t.Statement[] = [];
          for (const s of target.consequent) {
            if (t.isBreakStatement(s)) break;
            body.push(s);
          }
          if (body.length === 0) path.remove();
          else path.replaceWithMultiple(body);
          changed = true;
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default switchSimplify;


