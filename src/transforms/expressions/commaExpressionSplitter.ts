import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 逗号表达式拆分器
 * 将复杂的逗号表达式拆分为多个独立的语句，显著减少代码复杂度
 */

// 检查表达式是否可以安全地作为独立语句
function canBeStatement(expr: t.Expression): boolean {
  return (
    t.isAssignmentExpression(expr) ||
    t.isCallExpression(expr) ||
    t.isUpdateExpression(expr) ||
    (t.isMemberExpression(expr) && t.isAssignmentExpression(expr)) ||
    t.isNewExpression(expr)
  );
}

// 拆分逗号表达式为多个语句
function splitSequenceExpression(seqExpr: t.SequenceExpression): {
  statements: t.Statement[];
  finalExpression: t.Expression | null;
} {
  const statements: t.Statement[] = [];
  let finalExpression: t.Expression | null = null;
  
  for (let i = 0; i < seqExpr.expressions.length; i++) {
    const expr = seqExpr.expressions[i];
    
    if (i === seqExpr.expressions.length - 1) {
      // 最后一个表达式可能需要保留其值
      if (canBeStatement(expr)) {
        statements.push(t.expressionStatement(expr));
      } else {
        finalExpression = expr;
      }
    } else {
      // 中间的表达式转换为语句
      if (canBeStatement(expr)) {
        statements.push(t.expressionStatement(expr));
      }
    }
  }
  
  return { statements, finalExpression };
}

// 处理return语句中的逗号表达式
function handleReturnSequence(returnStmt: t.ReturnStatement): t.Statement[] {
  if (!returnStmt.argument || !t.isSequenceExpression(returnStmt.argument)) {
    return [returnStmt];
  }
  
  const seqExpr = returnStmt.argument;
  const { statements, finalExpression } = splitSequenceExpression(seqExpr);
  
  // 创建新的return语句
  const newReturnStmt = t.returnStatement(finalExpression);
  
  return [...statements, newReturnStmt];
}

// 处理表达式语句中的逗号表达式
function handleExpressionSequence(exprStmt: t.ExpressionStatement): t.Statement[] {
  if (!t.isSequenceExpression(exprStmt.expression)) {
    return [exprStmt];
  }
  
  const seqExpr = exprStmt.expression;
  const { statements, finalExpression } = splitSequenceExpression(seqExpr);
  
  // 如果有最终表达式，也作为语句添加
  if (finalExpression && canBeStatement(finalExpression)) {
    statements.push(t.expressionStatement(finalExpression));
  }
  
  return statements.length > 0 ? statements : [exprStmt];
}

const commaExpressionSplitter: Transform = {
  name: 'commaExpressionSplitter',
  description: '拆分复杂的逗号表达式为多个独立语句',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);

    traverse(ast, {
      // 处理switch case中的逗号表达式
      SwitchCase(path) {
        const caseNode = path.node;
        const newConsequent: t.Statement[] = [];
        
        for (const stmt of caseNode.consequent) {
          if (t.isReturnStatement(stmt) && stmt.argument && t.isSequenceExpression(stmt.argument)) {
            // 处理return语句中的逗号表达式
            const expandedStmts = handleReturnSequence(stmt);
            newConsequent.push(...expandedStmts);
            if (expandedStmts.length > 1) {
              changed = true;
            }
          } else if (t.isExpressionStatement(stmt) && t.isSequenceExpression(stmt.expression)) {
            // 处理表达式语句中的逗号表达式
            const expandedStmts = handleExpressionSequence(stmt);
            newConsequent.push(...expandedStmts);
            if (expandedStmts.length > 1) {
              changed = true;
            }
          } else {
            newConsequent.push(stmt);
          }
        }
        
        if (changed) {
          caseNode.consequent = newConsequent;
        }
      },
      
      // 处理其他地方的逗号表达式
      ExpressionStatement(path) {
        const stmt = path.node;
        if (t.isSequenceExpression(stmt.expression)) {
          const seqExpr = stmt.expression;
          
          // 只处理长度大于3的逗号表达式
          if (seqExpr.expressions.length > 3) {
            const expandedStmts = handleExpressionSequence(stmt);
            if (expandedStmts.length > 1) {
              path.replaceWithMultiple(expandedStmts);
              changed = true;
            }
          }
        }
      },
      
      // 处理return语句中的逗号表达式
      ReturnStatement(path) {
        const stmt = path.node;
        if (stmt.argument && t.isSequenceExpression(stmt.argument)) {
          const seqExpr = stmt.argument;
          
          // 只处理长度大于2的逗号表达式
          if (seqExpr.expressions.length > 2) {
            const expandedStmts = handleReturnSequence(stmt);
            if (expandedStmts.length > 1) {
              path.replaceWithMultiple(expandedStmts);
              changed = true;
            }
          }
        }
      },
      
      // 处理if语句条件中的逗号表达式
      IfStatement(path) {
        const ifStmt = path.node;
        if (t.isSequenceExpression(ifStmt.test)) {
          const seqExpr = ifStmt.test;
          if (seqExpr.expressions.length > 1) {
            // 将前面的表达式提取为语句
            const statements: t.Statement[] = [];
            for (let i = 0; i < seqExpr.expressions.length - 1; i++) {
              const expr = seqExpr.expressions[i];
              if (canBeStatement(expr)) {
                statements.push(t.expressionStatement(expr));
              }
            }
            
            // 使用最后一个表达式作为条件
            ifStmt.test = seqExpr.expressions[seqExpr.expressions.length - 1];
            
            if (statements.length > 0) {
              path.insertBefore(statements);
              changed = true;
            }
          }
        }
      }
    });

    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default commaExpressionSplitter;