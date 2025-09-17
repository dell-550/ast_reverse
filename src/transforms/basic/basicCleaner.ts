import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 基础清理模块
 * 进行基本的代码清理和优化，即使无法完全解混淆也能提高可读性
 */
const basicCleaner: Transform = {
  name: 'basicCleaner',
  description: '基础代码清理和格式化',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function visitNode(node: any) {
      // 将十六进制数字转换为十进制（更激进的转换）
      if (t.isNumericLiteral(node)) {
        const value = node.value;
        // 转换所有十六进制数字
        if (node.extra && node.extra.raw && typeof node.extra.raw === 'string' && node.extra.raw.startsWith('0x')) {
          // 移除十六进制表示，强制使用十进制
          delete node.extra.raw;
          delete node.extra.rawValue;
          changed = true;
          context?.debug?.(`转换十六进制数字: 0x${value.toString(16)} -> ${value}`);
        }
      }
      
      // 简化逗号表达式 (0x0, expr) -> expr
      if (t.isSequenceExpression(node)) {
        const expressions = node.expressions;
        
        // 如果第一个表达式是 0 或 0x0，移除它
        if (expressions.length >= 2 && 
            t.isNumericLiteral(expressions[0]) && 
            expressions[0].value === 0) {
          
          // 如果只有两个表达式，直接替换为第二个
          if (expressions.length === 2) {
            Object.assign(node, expressions[1]);
            changed = true;
            context?.debug?.('简化逗号表达式: (0, expr) -> expr');
          } else {
            // 移除第一个表达式
            expressions.shift();
            changed = true;
            context?.debug?.('移除逗号表达式中的前导0');
          }
        }
      }
      
      // 简化 while(0x1) -> while(true)
      if (t.isWhileStatement(node) && 
          t.isNumericLiteral(node.test) && 
          node.test.value === 1) {
        node.test = t.booleanLiteral(true);
        changed = true;
        context?.debug?.('简化while循环: while(0x1) -> while(true)');
      }
      
      // 添加注释标记混淆的函数调用
      if (t.isCallExpression(node)) {
        const callee = node.callee;
        const args = node.arguments;
        
        // 标记字符串解码函数调用
        if (t.isIdentifier(callee) && 
            callee.name.match(/^_0x[a-fA-F0-9]+$/) && 
            args.length === 1 && 
            t.isNumericLiteral(args[0])) {
          
          // 添加内联注释
          const comment = ` 字符串调用: ${callee.name}(0x${args[0].value.toString(16)}) `;
          if (!node.leadingComments) {
            node.leadingComments = [];
          }
          
          // 检查是否已经有相同的注释
          const hasComment = node.leadingComments.some((c: any) => 
            c.value && c.value.includes('字符串调用'));
          
          if (!hasComment) {
            node.leadingComments.push({
              type: 'CommentBlock',
              value: comment
            } as any);
            context?.debug?.(`标记字符串调用: ${callee.name}(0x${args[0].value.toString(16)})`);
          }
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

export default basicCleaner;