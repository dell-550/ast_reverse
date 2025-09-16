import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../../types';

const allowed = new Set(['+','-','*','/','%','<<','>>','>>>','|','&','^','===','!==','==','!=','<','<=','>','>=']);

const binaryFold: Transform = {
  name: 'expressions/binaryFold',
  description: '常量二元表达式折叠',
  phase: 10,
  enabledByDefault: true,
  run(ast) {
    let edits = 0;
    traverse(ast, {
      BinaryExpression(path) {
        const { left, right, operator } = path.node;
        if (!allowed.has(operator)) return;
        if (t.isLiteral(left) && t.isLiteral(right)) {
          try {
            // eslint-disable-next-line no-eval
            const v = eval(`${JSON.stringify((left as any).value)} ${operator} ${JSON.stringify((right as any).value)}`);
            const lit = typeof v === 'string' ? t.stringLiteral(v)
              : typeof v === 'number' ? t.numericLiteral(v)
              : typeof v === 'boolean' ? t.booleanLiteral(v)
              : v === null ? t.nullLiteral() : null;
            if (lit) { path.replaceWith(lit); edits++; }
          } catch {}
        }
      }
    });
    return { edits };
  }
};

export default binaryFold;


