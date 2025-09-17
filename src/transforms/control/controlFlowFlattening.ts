import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 控制流扁平化模块
 * 简化复杂的switch-case状态机结构，还原原始的程序逻辑流程
 */
const controlFlowFlattening: Transform = {
  name: 'controlFlowFlattening',
  description: '简化被扁平化的控制流结构',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function isControlFlowPattern(node: any): boolean {
      // 检查是否是控制流扁平化模式:
      // while(true) { switch(state) { case 0: ... break; case 1: ... break; } }
      return t.isWhileStatement(node) &&
             t.isBooleanLiteral(node.test, { value: true }) &&
             t.isBlockStatement(node.body) &&
             node.body.body.length === 1 &&
             t.isSwitchStatement(node.body.body[0]);
    }
    
    function extractSequentialFlow(switchStmt: t.SwitchStatement): t.Statement[] | null {
      const cases = switchStmt.cases;
      const statements: t.Statement[] = [];
      
      // 分析case的执行顺序
      const caseMap = new Map<number | string, t.SwitchCase>();
      let hasDefault = false;
      
      for (const caseNode of cases) {
        if (caseNode.test === null) {
          hasDefault = true;
          continue;
        }
        
        if (t.isNumericLiteral(caseNode.test)) {
          caseMap.set(caseNode.test.value, caseNode);
        } else if (t.isStringLiteral(caseNode.test)) {
          caseMap.set(caseNode.test.value, caseNode);
        }
      }
      
      // 尝试按顺序重建控制流
      const sortedKeys = Array.from(caseMap.keys()).sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        return String(a).localeCompare(String(b));
      });
      
      for (const key of sortedKeys) {
        const caseNode = caseMap.get(key)!;
        const caseStatements = caseNode.consequent;
        
        // 过滤掉break语句和状态赋值语句
        const filteredStatements = caseStatements.filter(stmt => {
          if (t.isBreakStatement(stmt)) return false;
          
          // 过滤状态赋值: _0x4f5996[_0x1d08b8(0x36e)] = 0x12
          if (t.isExpressionStatement(stmt) && t.isAssignmentExpression(stmt.expression)) {
            const left = stmt.expression.left;
            if (t.isMemberExpression(left) && t.isNumericLiteral(stmt.expression.right)) {
              return false; // 这可能是状态赋值
            }
          }
          
          return true;
        });
        
        statements.push(...filteredStatements);
      }
      
      return statements.length > 0 ? statements : null;
    }
    
    function visitNode(node: any) {
      if (isControlFlowPattern(node)) {
        const whileStmt = node as t.WhileStatement;
        const switchStmt = (whileStmt.body as t.BlockStatement).body[0] as t.SwitchStatement;
        
        const sequentialFlow = extractSequentialFlow(switchStmt);
        if (sequentialFlow) {
          // 将while循环替换为顺序执行的语句块
          const blockStatement = t.blockStatement(sequentialFlow);
          Object.assign(node, blockStatement);
          changed = true;
          context?.debug?.(`简化控制流: 将${switchStmt.cases.length}个case转换为顺序执行`);
        }
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

export default controlFlowFlattening;