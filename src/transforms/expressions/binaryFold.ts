import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

const allowed = new Set(['+','-','*','/','%','<<','>>','>>>','|','&','^','===','!==','==','!=','<','<=','>','>=']);

const binaryFold: Transform = {
  name: 'binaryFold',
  description: '计算二元表达式',
  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    
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
            if (lit) { path.replaceWith(lit); changed = true; }
          } catch {}
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default binaryFold;


