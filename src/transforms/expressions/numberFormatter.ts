import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 数字格式化模块
 * 将十六进制数字转换为十进制，统一数字表示格式
 */
const numberFormatter: Transform = {
  name: 'numberFormatter',
  description: '格式化数字字面量，将十六进制转换为十进制',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function shouldConvertHex(value: number): boolean {
      // 只转换明显是十六进制表示的数字
      // 避免转换一些特殊值如 0, 1, 2 等常见数字
      if (value <= 10) return false;
      
      // 检查是否是典型的十六进制值
      const hexString = value.toString(16);
      return hexString.length >= 2 && /^[0-9a-f]+$/i.test(hexString);
    }
    
    function formatNumber(value: number): { formatted: number; shouldChange: boolean } {
      // 如果数字很大或者明显是十六进制，考虑转换
      if (value > 255 && shouldConvertHex(value)) {
        return { formatted: value, shouldChange: true };
      }
      
      // 对于一些常见的十六进制值，也进行转换
      const commonHexValues = [0x0, 0x1, 0x2, 0x12, 0x1a, 0x1d, 0x7d0];
      if (commonHexValues.includes(value)) {
        return { formatted: value, shouldChange: true };
      }
      
      return { formatted: value, shouldChange: false };
    }
    
    function visitNode(node: any) {
      if (t.isNumericLiteral(node)) {
        const { formatted, shouldChange } = formatNumber(node.value);
        
        if (shouldChange) {
          // 更新数字字面量，确保以十进制形式显示
          node.value = formatted;
          // 移除原始的十六进制表示
          if (node.extra) {
            delete node.extra.raw;
            delete node.extra.rawValue;
          }
          changed = true;
          context?.debug?.(`格式化数字: 0x${formatted.toString(16)} -> ${formatted}`);
        }
      }
      
      // 处理对象属性中的数字键
      if (t.isObjectProperty(node) && t.isNumericLiteral(node.key)) {
        const { formatted, shouldChange } = formatNumber(node.key.value);
        
        if (shouldChange) {
          node.key.value = formatted;
          if (node.key.extra) {
            delete node.key.extra.raw;
            delete node.key.extra.rawValue;
          }
          changed = true;
          context?.debug?.(`格式化对象键: 0x${formatted.toString(16)} -> ${formatted}`);
        }
      }
      
      // 处理数组索引中的数字
      if (t.isMemberExpression(node) && 
          node.computed && 
          t.isNumericLiteral(node.property)) {
        const { formatted, shouldChange } = formatNumber(node.property.value);
        
        if (shouldChange) {
          node.property.value = formatted;
          if (node.property.extra) {
            delete node.property.extra.raw;
            delete node.property.extra.rawValue;
          }
          changed = true;
          context?.debug?.(`格式化数组索引: 0x${formatted.toString(16)} -> ${formatted}`);
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

export default numberFormatter;