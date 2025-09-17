import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 状态机简化器
 * 专门处理复杂的状态机模式，将while(true) + switch转换为更简洁的代码
 */

// 分析状态机的跳转模式
function analyzeStateMachine(switchNode: t.SwitchStatement): {
  hasSimpleFlow: boolean;
  canSimplify: boolean;
  linearCases: t.SwitchCase[];
} {
  const cases = switchNode.cases;
  let hasSimpleFlow = true;
  let linearCases: t.SwitchCase[] = [];
  
  for (const caseNode of cases) {
    // 检查case是否有简单的线性流程
    if (isLinearCase(caseNode)) {
      linearCases.push(caseNode);
    } else {
      hasSimpleFlow = false;
    }
  }
  
  return {
    hasSimpleFlow,
    canSimplify: linearCases.length > 0,
    linearCases
  };
}

// 检查是否是线性case（没有复杂的跳转逻辑）
function isLinearCase(caseNode: t.SwitchCase): boolean {
  if (caseNode.consequent.length === 0) return true;
  
  let hasReturn = false;
  let hasBreak = false;
  let hasComplexLogic = false;
  
  for (const stmt of caseNode.consequent) {
    if (t.isReturnStatement(stmt)) {
      hasReturn = true;
    } else if (t.isBreakStatement(stmt)) {
      hasBreak = true;
    } else if (t.isIfStatement(stmt) || t.isWhileStatement(stmt) || t.isForStatement(stmt)) {
      hasComplexLogic = true;
    }
  }
  
  // 线性case应该有明确的结束（return或break），且没有复杂逻辑
  return (hasReturn || hasBreak) && !hasComplexLogic;
}

// 简化逗号表达式序列
function simplifySequenceInCase(caseNode: t.SwitchCase): boolean {
  let simplified = false;
  
  for (let i = 0; i < caseNode.consequent.length; i++) {
    const stmt = caseNode.consequent[i];
    
    if (t.isExpressionStatement(stmt) && t.isSequenceExpression(stmt.expression)) {
      const seqExpr = stmt.expression;
      
      // 将长的逗号表达式拆分为多个语句
      if (seqExpr.expressions.length > 3) {
        const newStatements: t.Statement[] = [];
        
        // 将每个表达式转换为单独的语句
        for (const expr of seqExpr.expressions) {
          if (t.isAssignmentExpression(expr) || t.isCallExpression(expr)) {
            newStatements.push(t.expressionStatement(expr));
          }
        }
        
        // 替换原语句
        if (newStatements.length > 0) {
          caseNode.consequent.splice(i, 1, ...newStatements);
          simplified = true;
          i += newStatements.length - 1; // 调整索引
        }
      }
    }
  }
  
  return simplified;
}

// 提取case中的关键操作
function extractKeyOperations(caseNode: t.SwitchCase): {
  assignments: t.AssignmentExpression[];
  calls: t.CallExpression[];
  returns: t.ReturnStatement[];
} {
  const assignments: t.AssignmentExpression[] = [];
  const calls: t.CallExpression[] = [];
  const returns: t.ReturnStatement[] = [];
  
  function extractFromStatement(stmt: t.Statement) {
    if (t.isExpressionStatement(stmt)) {
      const expr = stmt.expression;
      if (t.isAssignmentExpression(expr)) {
        assignments.push(expr);
      } else if (t.isCallExpression(expr)) {
        calls.push(expr);
      } else if (t.isSequenceExpression(expr)) {
        // 从逗号表达式中提取
        for (const subExpr of expr.expressions) {
          if (t.isAssignmentExpression(subExpr)) {
            assignments.push(subExpr);
          } else if (t.isCallExpression(subExpr)) {
            calls.push(subExpr);
          }
        }
      }
    } else if (t.isReturnStatement(stmt)) {
      returns.push(stmt);
    }
  }
  
  for (const stmt of caseNode.consequent) {
    extractFromStatement(stmt);
  }
  
  return { assignments, calls, returns };
}

const stateMachineSimplifier: Transform = {
  name: 'stateMachineSimplifier',
  description: '简化复杂的状态机模式',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);

    traverse(ast, {
      // 专门处理while(true) + switch的状态机模式
      WhileStatement(path) {
        const { test, body } = path.node;
        
        // 确认是无限循环
        const isInfiniteLoop = (
          (t.isBooleanLiteral(test) && test.value === true) ||
          (t.isNumericLiteral(test) && test.value === 1)
        );
        
        if (!isInfiniteLoop || !t.isBlockStatement(body)) return;
        
        // 确认body中只有一个switch语句
        if (body.body.length === 1 && t.isSwitchStatement(body.body[0])) {
          const switchStmt = body.body[0];
          const analysis = analyzeStateMachine(switchStmt);
          
          if (analysis.canSimplify) {
            // 简化switch中的逗号表达式
            for (const caseNode of switchStmt.cases) {
              if (simplifySequenceInCase(caseNode)) {
                changed = true;
              }
            }
            
            // 添加注释说明这是一个状态机
            if (!switchStmt.leadingComments) {
              switchStmt.leadingComments = [];
            }
            switchStmt.leadingComments.push({
              type: 'CommentBlock',
              value: ' 状态机模式 - 已简化逗号表达式 '
            });
            
            // 如果有线性case，尝试进一步优化
            if (analysis.linearCases.length > 0) {
              for (const linearCase of analysis.linearCases) {
                const operations = extractKeyOperations(linearCase);
                
                // 为关键操作添加注释
                if (operations.assignments.length > 0 || operations.calls.length > 0) {
                  if (!linearCase.leadingComments) {
                    linearCase.leadingComments = [];
                  }
                  linearCase.leadingComments.push({
                    type: 'CommentLine',
                    value: ` 包含 ${operations.assignments.length} 个赋值, ${operations.calls.length} 个调用`
                  });
                }
              }
              changed = true;
            }
          }
        }
      },
      
      // 直接处理switch语句中的复杂表达式
      SwitchStatement(path) {
        const switchNode = path.node;
        
        for (const caseNode of switchNode.cases) {
          // 简化case中的逗号表达式
          if (simplifySequenceInCase(caseNode)) {
            changed = true;
          }
          
          // 简化case中的其他复杂表达式
          for (let i = 0; i < caseNode.consequent.length; i++) {
            const stmt = caseNode.consequent[i];
            
            if (t.isExpressionStatement(stmt)) {
              const expr = stmt.expression;
              
              // 简化嵌套的赋值表达式
              if (t.isAssignmentExpression(expr) && t.isSequenceExpression(expr.right)) {
                // 将右侧的逗号表达式简化为最后一个值
                const seqExpr = expr.right;
                if (seqExpr.expressions.length > 1) {
                  expr.right = seqExpr.expressions[seqExpr.expressions.length - 1];
                  changed = true;
                }
              }
            }
          }
        }
      }
    });

    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default stateMachineSimplifier;