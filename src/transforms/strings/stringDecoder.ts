import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 字符串解码模块
 * 解码各种编码的字符串，如十六进制、Unicode转义等
 */
const stringDecoder: Transform = {
  name: 'stringDecoder',
  description: '解码编码的字符串字面量',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function decodeString(value: string): string | null {
      try {
        // 处理十六进制编码 \x41 -> A
        if (value.includes('\\x')) {
          const decoded = value.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
          if (decoded !== value) return decoded;
        }
        
        // 处理Unicode编码 \u0041 -> A
        if (value.includes('\\u')) {
          const decoded = value.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
          if (decoded !== value) return decoded;
        }
        
        // 处理八进制编码 \101 -> A
        if (/\\[0-7]{1,3}/.test(value)) {
          const decoded = value.replace(/\\([0-7]{1,3})/g, (match, octal) => {
            return String.fromCharCode(parseInt(octal, 8));
          });
          if (decoded !== value) return decoded;
        }
        
        return null;
      } catch (e) {
        return null;
      }
    }
    
    // 字符串查找表，用于存储解码映射
    const stringTable = new Map<string, string>();
    
    function visitNode(node: any) {
      // 处理字符串字面量
      if (t.isStringLiteral(node)) {
        const decoded = decodeString(node.value);
        if (decoded !== null) {
          node.value = decoded;
          changed = true;
          context?.debug?.(`解码字符串: "${node.value}" -> "${decoded}"`);
        }
      }
      
      // 处理函数调用形式的字符串编码 _0x1d08b8(0x813)
      if (t.isCallExpression(node)) {
        const callee = node.callee;
        const args = node.arguments;
        
        // 检查是否是字符串解码函数调用模式
        if (t.isIdentifier(callee) && 
            callee.name.match(/^_0x[a-fA-F0-9]+$/) && 
            args.length === 1 && 
            (t.isNumericLiteral(args[0]) || t.isStringLiteral(args[0]))) {
          
          const key = `${callee.name}(${t.isNumericLiteral(args[0]) ? args[0].value : `"${args[0].value}"`})`;
          
          // 如果已经有解码结果，直接替换
          if (stringTable.has(key)) {
            const decodedValue = stringTable.get(key)!;
            // 将函数调用替换为字符串字面量
            Object.assign(node, t.stringLiteral(decodedValue));
            changed = true;
            context?.debug?.(`解码函数调用: ${key} -> "${decodedValue}"`);
          } else {
            // 对于无法解码的字符串调用，添加注释标记
            const comment = `/* 字符串编码调用: ${key} */`;
            if (!node.leadingComments) {
              node.leadingComments = [];
            }
            node.leadingComments.push({
              type: 'CommentBlock',
              value: ` 字符串编码调用: ${key} `
            } as any);
            context?.debug?.(`标记字符串编码调用: ${key}`);
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

export default stringDecoder;