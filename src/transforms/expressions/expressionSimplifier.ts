import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 表达式简化模块
 * 简化复杂的表达式结构，如逗号表达式、无用的包装表达式等
 */
const expressionSimplifier: Transform = {
  name: 'expressionSimplifier',
  description: '简化复杂的表达式结构',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function simplifySequenceExpression(node: t.SequenceExpression): t.Expression {
      // 逗号表达式 (a, b, c) 返回最后一个表达式的值
      // 如果前面的表达式没有副作用，可以直接返回最后一个
      const expressions = node.expressions;
      
      // 检查前面的表达式是否有副作用
      const hasNoSideEffects = (expr: t.Expression): boolean => {
        if (t.isLiteral(expr)) return true;
        if (t.isIdentifier(expr)) return true;
        if (t.isUnaryExpression(expr) && expr.operator === 'void') return true;
        if (t.isNumericLiteral(expr) && (expr as t.NumericLiteral).value === 0) return true;
        return false;
      };
      
      // 过滤掉没有副作用的前置表达式
      const meaningfulExpressions = [];
      for (let i = 0; i < expressions.length - 1; i++) {
        if (!hasNoSideEffects(expressions[i])) {
          meaningfulExpressions.push(expressions[i]);
        }
      }
      
      // 总是保留最后一个表达式
      meaningfulExpressions.push(expressions[expressions.length - 1]);
      
      if (meaningfulExpressions.length === 1) {
        return meaningfulExpressions[0];
      } else if (meaningfulExpressions.length < expressions.length) {
        return t.sequenceExpression(meaningfulExpressions);
      }
      
      return node;
    }
    
    function simplifyParenthesizedExpression(node: any): t.Expression | null {
      // 移除不必要的括号
      if (node.type === 'ParenthesizedExpression') {
        return node.expression;
      }
      return null;
    }
    
    function simplifyVoidExpression(node: t.UnaryExpression): t.Expression | null {
      // void 0 -> undefined
      if (node.operator === 'void' && t.isNumericLiteral(node.argument, { value: 0 })) {
        return t.identifier('undefined');
      }
      return null;
    }
    
    function visitNode(node: any) {
      // 简化逗号表达式
      if (t.isSequenceExpression(node)) {
        const simplified = simplifySequenceExpression(node);
        if (simplified !== node) {
          Object.assign(node, simplified);
          changed = true;
          context?.debug?.('简化逗号表达式');
        }
      }
      
      // 简化括号表达式
      const parenthesized = simplifyParenthesizedExpression(node);
      if (parenthesized) {
        Object.assign(node, parenthesized);
        changed = true;
        context?.debug?.('移除不必要的括号');
      }
      
      // 简化void表达式
      if (t.isUnaryExpression(node)) {
        const simplified = simplifyVoidExpression(node);
        if (simplified) {
          Object.assign(node, simplified);
          changed = true;
          context?.debug?.('简化void表达式为undefined');
        }
      }
      
      // 简化赋值表达式中的逗号表达式
      if (t.isAssignmentExpression(node) && t.isSequenceExpression(node.right)) {
        const simplified = simplifySequenceExpression(node.right);
        if (simplified !== node.right) {
          node.right = simplified;
          changed = true;
          context?.debug?.('简化赋值表达式中的逗号表达式');
        }
      }
      
      // 简化函数调用中的逗号表达式
      if (t.isCallExpression(node)) {
        // 简化被调用函数
        if (t.isSequenceExpression(node.callee)) {
          const simplified = simplifySequenceExpression(node.callee);
          if (simplified !== node.callee) {
            node.callee = simplified;
            changed = true;
            context?.debug?.('简化函数调用中的逗号表达式');
          }
        }
        
        // 简化参数中的逗号表达式
        node.arguments.forEach((arg: any, index: number) => {
          if (t.isSequenceExpression(arg)) {
            const simplified = simplifySequenceExpression(arg);
            if (simplified !== arg) {
              node.arguments[index] = simplified;
              changed = true;
              context?.debug?.('简化函数参数中的逗号表达式');
            }
          }
        });
      }
      
      // 递归处理子节点
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            child.forEach(visitNode);
          } else if (child.type) {
            visitNode(child);
          }
        }
      }
    }
    
    visitNode(ast);
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default expressionSimplifier;