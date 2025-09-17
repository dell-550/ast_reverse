import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

// 辅助函数：检查是否是简单的case（只有赋值和break）
function isSimpleCase(caseNode: t.SwitchCase): boolean {
  if (caseNode.consequent.length === 0) return true;
  if (caseNode.consequent.length > 3) return false;
  
  let hasBreak = false;
  let hasAssignment = false;
  
  for (const stmt of caseNode.consequent) {
    if (t.isBreakStatement(stmt)) {
      hasBreak = true;
    } else if (t.isExpressionStatement(stmt) && t.isAssignmentExpression(stmt.expression)) {
      hasAssignment = true;
    } else if (!t.isEmptyStatement(stmt)) {
      return false; // 包含其他复杂语句
    }
  }
  
  return hasBreak || hasAssignment;
}

// 辅助函数：为case添加注释
function addCommentToCase(caseNode: t.SwitchCase, comment: string): void {
  if (!caseNode.leadingComments) {
    caseNode.leadingComments = [];
  }
  caseNode.leadingComments.push({
    type: 'CommentLine',
    value: comment
  });
}

// 辅助函数：简化状态机模式的switch
function simplifyStateMachineSwitch(switchNode: t.SwitchStatement): boolean {
  let simplified = false;
  
  // 检查是否有明显的状态机模式
  const cases = switchNode.cases;
  if (cases.length < 2) return false;
  
  // 查找只包含赋值和break的简单case
  for (let i = 0; i < cases.length; i++) {
    const caseNode = cases[i];
    if (isSimpleCase(caseNode)) {
      // 标记为可以内联的case
      addCommentToCase(caseNode, '// 简单case，可考虑内联');
      simplified = true;
    }
  }
  
  return simplified;
}

// 辅助函数：简化case中的表达式
function simplifyCaseExpressions(caseNode: t.SwitchCase): boolean {
  let simplified = false;
  
  for (let i = 0; i < caseNode.consequent.length; i++) {
    const stmt = caseNode.consequent[i];
    
    if (t.isExpressionStatement(stmt)) {
      // 简化表达式语句
      const expr = stmt.expression;
      if (t.isSequenceExpression(expr) && expr.expressions.length === 2) {
        // 简化逗号表达式 (a, b) -> b
        stmt.expression = expr.expressions[1];
        simplified = true;
      }
    }
  }
  
  return simplified;
}

// 辅助函数：检查两个case是否可以合并
function canMergeCases(case1: t.SwitchCase, case2: t.SwitchCase): boolean {
  // 如果第一个case没有break语句，可以考虑合并
  const lastStmt = case1.consequent[case1.consequent.length - 1];
  return !t.isBreakStatement(lastStmt) && case1.consequent.length > 0;
}

/**
 * Switch语句解混淆器
 * 专门处理复杂的switch混淆模式，包括：
 * 1. 状态机模式的switch语句
 * 2. 无限循环中的switch语句
 * 3. 复杂的case分支逻辑
 */
const switchDeobfuscator: Transform = {
  name: 'switchDeobfuscator',
  description: '解混淆复杂的switch语句结构',

  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);

    traverse(ast, {
      // 处理while(true) + switch的模式
      WhileStatement(path) {
        const { test, body } = path.node;
        
        // 检查是否是while(true)或while(1)
        const isInfiniteLoop = (
          (t.isBooleanLiteral(test) && test.value === true) ||
          (t.isNumericLiteral(test) && test.value === 1)
        );
        
        if (!isInfiniteLoop || !t.isBlockStatement(body)) return;
        
        // 检查body中是否只有一个switch语句
        if (body.body.length === 1 && t.isSwitchStatement(body.body[0])) {
          const switchStmt = body.body[0];
          
          // 尝试简化这种模式
          if (simplifyStateMachineSwitch(switchStmt)) {
            // 如果成功简化，用简化后的代码替换while循环
            path.replaceWith(switchStmt);
            changed = true;
          }
        }
      },

      // 直接处理switch语句
      SwitchStatement(path) {
        const switchNode = path.node;
        
        // 尝试简化复杂的switch语句
        for (const caseNode of switchNode.cases) {
          if (simplifyCaseExpressions(caseNode)) {
            changed = true;
          }
        }
        
        // 移除空的case分支
        const originalLength = switchNode.cases.length;
        switchNode.cases = switchNode.cases.filter(caseNode => {
          // 保留有内容的case或default case
          return caseNode.consequent.length > 0 || !caseNode.test;
        });
        if (switchNode.cases.length < originalLength) {
          changed = true;
        }
        
        // 合并连续的case分支
        for (let i = 0; i < switchNode.cases.length - 1; i++) {
          const currentCase = switchNode.cases[i];
          const nextCase = switchNode.cases[i + 1];
          
          // 如果当前case没有break且下一个case内容相同
          if (canMergeCases(currentCase, nextCase)) {
            // 合并case
            currentCase.consequent.push(...nextCase.consequent);
            switchNode.cases.splice(i + 1, 1);
            changed = true;
            i--; // 重新检查当前位置
          }
        }
      }
    });

    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default switchDeobfuscator;