import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

/**
 * 判断表达式是否只由参数名和简单运算符组成
 * 允许：BinaryExpression, UnaryExpression, Identifier(param), NumericLiteral
 */
function isSimpleParamExpr(expr: t.Expression, params: string[]): boolean {
  if (t.isIdentifier(expr)) {
    return params.includes(expr.name);
  }
  // 字面量常量可以直接出现在函数体内（如 return a + 1）
  if (
    t.isNumericLiteral(expr) ||
    t.isStringLiteral(expr) ||
    t.isBooleanLiteral(expr) ||
    t.isNullLiteral(expr)
  ) {
    return true;
  }
  if (t.isBinaryExpression(expr)) {
    const left = t.isPrivateName(expr.left) ? null : expr.left;
    const right = t.isPrivateName(expr.right) ? null : expr.right;
    return (
      (left ? isSimpleParamExpr(left, params) : false) &&
      (right ? isSimpleParamExpr(right, params) : false)
    );
  }
  if (t.isUnaryExpression(expr)) {
    return isSimpleParamExpr(expr.argument, params);
  }
  return false;
}

/**
 * 深度克隆表达式并将参数替换为实际传入的参数
 */
function substituteParams(
  expr: t.Expression,
  params: string[],
  args: t.Expression[],
): t.Expression {
  if (t.isIdentifier(expr)) {
    const idx = params.indexOf(expr.name);
    if (idx >= 0 && idx < args.length) {
      return t.cloneNode(args[idx], true);
    }
    return t.cloneNode(expr, true);
  }
  if (t.isBinaryExpression(expr)) {
    const left = t.isPrivateName(expr.left)
      ? (t.cloneNode(expr.left, true) as any as t.Expression)
      : substituteParams(expr.left, params, args);
    const right = t.isPrivateName(expr.right)
      ? (t.cloneNode(expr.right, true) as any as t.Expression)
      : substituteParams(expr.right, params, args);
    return t.binaryExpression(expr.operator, left, right);
  }
  if (t.isUnaryExpression(expr)) {
    return t.unaryExpression(
      expr.operator,
      substituteParams(expr.argument, params, args),
      expr.prefix,
    );
  }
  return t.cloneNode(expr, true);
}

type InlineableFunc = {
  params: string[];
  bodyExpr: t.Expression;
};

/**
 * 内联形如 `var F = function(a, b) { return a op b; }` 的单表达式包装函数
 * 将所有直接调用 F(x, y) 替换为 x op y
 *
 * 例如：
 *   var XS = function(a, b) { return a / b; }  →  消除
 *   XS(Ql, bx)                                  →  Ql / bx
 *   var xx = function(a, b) { return a > b; }   →  消除
 *   xx(qb, vB)                                  →  qb > vB
 */
const wrapperFunctionInliner: Transform = {
  name: 'wrapperFunctionInliner',
  description: '内联仅含单一运算表达式的包装函数',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;
    const inlineable = new Map<string, InlineableFunc>();

    // 第一遍：收集可内联的函数
    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (!t.isIdentifier(id)) return;
        if (!t.isFunctionExpression(init) && !t.isArrowFunctionExpression(init)) return;

        const fn = init;
        if (!t.isBlockStatement(fn.body)) return;
        if (fn.body.body.length !== 1) return;
        const stmt = fn.body.body[0];
        if (!t.isReturnStatement(stmt) || !stmt.argument) return;

        const expr = stmt.argument;
        const paramNames: (string | null)[] = fn.params.map((p) =>
          t.isIdentifier(p) ? p.name : null,
        );
        if (paramNames.some((p) => p === null)) return;

        if (isSimpleParamExpr(expr, paramNames as string[])) {
          inlineable.set(id.name, {
            params: paramNames as string[],
            bodyExpr: expr,
          });
          context?.debug?.(`收集可内联函数: ${id.name}(${paramNames.join(', ')})`);
        }
      },
    });

    if (inlineable.size === 0) return { changed: false };

    // 第二遍：替换直接调用点
    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        if (!t.isIdentifier(callee)) return;

        const fn = inlineable.get(callee.name);
        if (!fn) return;
        if (path.node.arguments.length !== fn.params.length) return;
        if (path.node.arguments.some((a) => t.isSpreadElement(a))) return;

        const args = path.node.arguments as t.Expression[];
        const inlined = substituteParams(fn.bodyExpr, fn.params, args);
        path.replaceWith(inlined);
        changed = true;
      },
    });

    return { changed };
  },
};

export default wrapperFunctionInliner;
