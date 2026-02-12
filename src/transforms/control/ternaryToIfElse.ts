import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { Transform, TransformContext, TransformResult } from '../../types';

/**
 * 三目表达式转if-else模块
 * 将三元条件表达式转换为if-else语句，提高代码可读性
 */
const ternaryToIfElse: Transform = {
  name: 'ternaryToIfElse',
  description: '将三目表达式转换为if-else语句',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;

    traverse(ast, {
      VariableDeclarator(path) {
        const init = path.node.init;

        // 只处理三目表达式
        if (!t.isConditionalExpression(init)) return;

        const id = path.node.id; // 变量名
        const test = init.test; // 条件
        const consequent = init.consequent; // true分支
        const alternate = init.alternate; // false分支

        // 创建变量声明（不初始化）
        const varDecl = t.variableDeclaration('var', [
          t.variableDeclarator(id, null),
        ]);

        // 确保 id 是有效的标识符或模式
        if (!t.isIdentifier(id) && !t.isPattern(id)) {
          return;
        }

        // 创建if-else语句
        const ifStmt = t.ifStatement(
          test,
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression('=', id as t.LVal, consequent)
            ),
          ]),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression('=', id as t.LVal, alternate)
            ),
          ])
        );

        // 用 var + if 替换原语句
        if (path.parentPath && t.isVariableDeclaration(path.parent)) {
          const parentPath = path.parentPath;
          const statements = [varDecl, ifStmt];

          // 如果变量声明只有一个声明器，直接替换整个声明
          if (path.parent.declarations.length === 1) {
            parentPath.replaceWithMultiple(statements);
          } else {
            // 如果有多个声明器，需要更复杂的处理
            // 先替换当前声明器
            path.node.init = null;
            // 然后在后面插入if语句
            parentPath.insertAfter(ifStmt);
          }

          changed = true;
          context?.debug?.(
            `转换三目表达式: 条件表达式 -> if-else`
          );
        }
      },
    });

    return { changed };
  },
};

export default ternaryToIfElse;
