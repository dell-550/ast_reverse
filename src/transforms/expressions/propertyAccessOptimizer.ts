import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 属性访问优化模块
 * 将动态属性访问优化为静态访问，提高代码可读性
 */
const propertyAccessOptimizer: Transform = {
  name: 'propertyAccessOptimizer',
  description: '优化对象属性访问，将动态访问转换为静态访问',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    function isValidIdentifier(str: string): boolean {
      // 检查字符串是否是有效的JavaScript标识符
      return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) && !isReservedWord(str);
    }
    
    function isReservedWord(str: string): boolean {
      const reserved = [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
        'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
        'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
        'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
        'var', 'void', 'while', 'with', 'yield', 'let', 'static',
        'enum', 'implements', 'interface', 'package', 'private',
        'protected', 'public', 'await', 'abstract', 'boolean', 'byte',
        'char', 'double', 'final', 'float', 'goto', 'int', 'long',
        'native', 'short', 'synchronized', 'throws', 'transient', 'volatile'
      ];
      return reserved.includes(str);
    }
    
    function optimizeMemberExpression(node: t.MemberExpression): boolean {
      // 只处理计算属性访问 obj["prop"] -> obj.prop
      if (!node.computed) return false;
      
      const property = node.property;
      
      // 处理字符串字面量属性
      if (t.isStringLiteral(property)) {
        const propName = property.value;
        
        if (isValidIdentifier(propName)) {
          // 转换为静态属性访问
          node.property = t.identifier(propName);
          node.computed = false;
          return true;
        }
      }
      
      // 处理数字字面量属性（数组索引除外）
      if (t.isNumericLiteral(property)) {
        const propValue = property.value;
        
        // 如果是整数且不是数组索引模式，转换为字符串属性
        if (Number.isInteger(propValue) && propValue >= 0) {
          const propName = propValue.toString();
          
          // 对于小的正整数，保持数字索引；对于大数字，转换为字符串属性
          if (propValue > 1000 || propValue < 0) {
            if (isValidIdentifier(propName)) {
              node.property = t.identifier(propName);
              node.computed = false;
              return true;
            }
          }
        }
      }
      
      return false;
    }
    
    function optimizeObjectProperty(node: t.ObjectProperty): boolean {
      // 优化对象属性定义 { "prop": value } -> { prop: value }
      if (node.computed) return false;
      
      const key = node.key;
      
      if (t.isStringLiteral(key)) {
        const propName = key.value;
        
        if (isValidIdentifier(propName)) {
          node.key = t.identifier(propName);
          return true;
        }
      }
      
      return false;
    }
    
    function visitNode(node: any) {
      // 优化成员表达式
      if (t.isMemberExpression(node)) {
        if (optimizeMemberExpression(node)) {
          changed = true;
          const propName = t.isIdentifier(node.property) ? node.property.name : 'unknown';
          context?.debug?.(`优化属性访问: ["${propName}"] -> .${propName}`);
        }
      }
      
      // 优化对象属性
      if (t.isObjectProperty(node)) {
        if (optimizeObjectProperty(node)) {
          changed = true;
          const propName = t.isIdentifier(node.key) ? node.key.name : 'unknown';
          context?.debug?.(`优化对象属性: "${propName}" -> ${propName}`);
        }
      }
      
      // 优化方法定义
      if (t.isObjectMethod(node)) {
        const key = node.key;
        if (t.isStringLiteral(key)) {
          const propName = key.value;
          if (isValidIdentifier(propName)) {
            node.key = t.identifier(propName);
            node.computed = false;
            changed = true;
            context?.debug?.(`优化方法定义: "${propName}" -> ${propName}`);
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

export default propertyAccessOptimizer;