import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

/**
 * 检查字符串是否为合法的 JS 标识符（非保留字）
 */
const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'finally', 'for', 'function', 'if', 'implements', 'import',
  'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'static', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
]);

const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function isValidIdentifier(s: string): boolean {
  return IDENTIFIER_RE.test(s) && !RESERVED_WORDS.has(s);
}

const propertyAccessSimplifier: Transform = {
  name: 'propertyAccessSimplifier',
  description: '将 obj["propName"] 形式的计算属性访问转换为 obj.propName 点访问形式',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;

    traverse(ast, {
      MemberExpression(path) {
        if (!path.node.computed) return;
        const prop = path.node.property;
        if (!t.isStringLiteral(prop)) return;
        if (!isValidIdentifier(prop.value)) return;

        path.node.computed = false;
        path.node.property = t.identifier(prop.value);
        changed = true;
        context?.debug?.(`属性访问: ["${prop.value}"] → .${prop.value}`);
      },
    });

    return { changed };
  },
};

export default propertyAccessSimplifier;
