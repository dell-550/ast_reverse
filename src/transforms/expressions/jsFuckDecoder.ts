import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

// 最大递归深度，防止超深 AST 导致栈溢出
const MAX_DEPTH = 32;

/**
 * 递归求值纯常量表达式（不含任何标识符引用）
 * 返回 JS 原始值，失败返回 undefined
 *
 * 支持的模式（JSFuck 常见用法）：
 *   +[]         → 0
 *   !+[]        → true
 *   +!+[]       → 1
 *   !+[] + !+[] → 2  (true + true)
 *   [+!+[]]+[+[]] → "10"  (数组字符串拼接)
 *   [+!+[]]+[+[]]-[] → 10  (字符串转数字)
 *   以及所有不含变量引用的常量折叠
 */
function evalConstExpr(node: t.Expression, depth = 0): any {
  if (depth > MAX_DEPTH) return undefined;

  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;

  // 含 Identifier 的节点不能静态求值，提前退出
  if (t.isIdentifier(node)) return undefined;

  if (t.isArrayExpression(node)) {
    // 只支持不含 spread 的数组
    const els: any[] = [];
    for (const el of node.elements) {
      if (el === null || t.isSpreadElement(el)) return undefined;
      const v = evalConstExpr(el as t.Expression, depth + 1);
      if (v === undefined) return undefined;
      els.push(v);
    }
    return els;
  }

  if (t.isUnaryExpression(node)) {
    const arg = evalConstExpr(node.argument, depth + 1);
    if (arg === undefined) return undefined;
    // 让 JS 引擎执行真实的一元运算（保留类型强制转换语义）
    switch (node.operator) {
      case '+': return +arg;
      case '-': return -arg;
      case '!': return !arg;
      case '~': return ~arg;
      case 'void': return undefined; // 不折叠 void
      default: return undefined;
    }
  }

  if (t.isLogicalExpression(node)) {
    const left = evalConstExpr(node.left, depth + 1);
    if (left === undefined) return undefined;
    // 短路：左侧已决定结果时，右侧不需要求值
    if (node.operator === '&&' && !left) return left;
    if (node.operator === '||' && left) return left;
    const right = evalConstExpr(node.right, depth + 1);
    if (right === undefined) return undefined;
    switch (node.operator) {
      case '&&': return right;
      case '||': return right;
      case '??': return left !== null && left !== undefined ? left : right;
      default:   return undefined;
    }
  }

  if (t.isBinaryExpression(node)) {
    if (t.isPrivateName(node.left) || t.isPrivateName(node.right)) return undefined;
    const left = evalConstExpr(node.left as t.Expression, depth + 1);
    const right = evalConstExpr(node.right as t.Expression, depth + 1);
    if (left === undefined || right === undefined) return undefined;
    switch (node.operator) {
      case '+':   return left + right;
      case '-':   return left - right;
      case '*':   return left * right;
      case '/':   return left / right;
      case '%':   return left % right;
      case '**':  return Math.pow(left, right);
      case '==':  return left == right;   // eslint-disable-line eqeqeq
      case '!=':  return left != right;   // eslint-disable-line eqeqeq
      case '===': return left === right;
      case '!==': return left !== right;
      case '<':   return left < right;
      case '<=':  return left <= right;
      case '>':   return left > right;
      case '>=':  return left >= right;
      case '&':   return left & right;
      case '|':   return left | right;
      case '^':   return left ^ right;
      case '<<':  return left << right;
      case '>>':  return left >> right;
      case '>>>': return (left >>> right);
      default:    return undefined;
    }
  }

  // 其他节点类型（Identifier、CallExpression 等）不能静态求值
  return undefined;
}

/**
 * 将 JS 原始值转为 Babel 字面量节点
 * 仅处理 number / string / boolean；数组/对象返回 null
 *
 * 注意：NumericLiteral 可以存负数，不能用 UnaryExpression('-', ...)
 * 否则 exit 访问器会再次匹配 UnaryExpression 导致无限循环。
 */
function makeLiteral(val: any): t.Expression | null {
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    return t.numericLiteral(val);
  }
  if (typeof val === 'boolean') return t.booleanLiteral(val);
  if (typeof val === 'string') return t.stringLiteral(val);
  return null;
}

const jsFuckDecoder: Transform = {
  name: 'jsFuckDecoder',
  description:
    '对 +!+[]、!+[] 等 JSFuck 风格常量表达式（及所有纯常量子表达式）进行求值并替换为字面量',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;

    traverse(ast, {
      // exit：自底向上，子节点先折叠，父节点再折叠
      'BinaryExpression|UnaryExpression|LogicalExpression': {
        exit(path) {
          const node = path.node as t.BinaryExpression | t.UnaryExpression | t.LogicalExpression;
          const val = evalConstExpr(node);
          if (val === undefined) return;

          const lit = makeLiteral(val);
          if (!lit) return;

          // 避免重复替换（已经是等价字面量）
          const origNode = path.node as t.Expression;
          if (t.isNumericLiteral(lit) && t.isNumericLiteral(origNode) && lit.value === origNode.value) return;
          if (t.isBooleanLiteral(lit) && t.isBooleanLiteral(origNode) && lit.value === origNode.value) return;

          path.replaceWith(lit);
          changed = true;
          context?.debug?.(`常量折叠: → ${JSON.stringify(val)}`);
        },
      },
    });

    return { changed };
  },
};

export default jsFuckDecoder;
