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
    
    function visitNode(node: any) {
      if (t.isStringLiteral(node)) {
        const decoded = decodeString(node.value);
        if (decoded !== null) {
          node.value = decoded;
          changed = true;
          context?.debug?.(`解码字符串: "${node.value}" -> "${decoded}"`);
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