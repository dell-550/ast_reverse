import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 变量名清理模块
 * 清理和标准化混淆的变量名，提高代码可读性
 */
const variableCleaner: Transform = {
  name: 'variableCleaner',
  description: '清理混淆的变量名，提供更有意义的命名',
  
  run(code: string, context?: TransformContext): TransformResult {
    let changed = false;
    const ast = parse(code);
    
    // 变量重命名映射表
    const renameMap = new Map<string, string>();
    let counter = 1;
    
    function generateCleanName(originalName: string): string {
      // 如果是十六进制变量名，生成更清晰的名称
      if (originalName.match(/^_0x[a-fA-F0-9]+$/)) {
        return `var_${counter++}`;
      }
      
      // 如果是其他混淆模式，也进行清理
      if (originalName.match(/^_0x/) || originalName.length > 10) {
        return `var_${counter++}`;
      }
      
      return originalName;
    }
    
    function shouldRename(name: string): boolean {
      // 检查是否是需要重命名的混淆变量
      return name.match(/^_0x[a-fA-F0-9]+$/) !== null ||
             name.match(/^_0x/) !== null ||
             (name.length > 8 && name.match(/^[a-zA-Z0-9_]+$/) !== null && name.includes('_'));
    }
    
    function visitNode(node: any) {
      // 处理标识符
      if (t.isIdentifier(node)) {
        const originalName = node.name;
        
        if (shouldRename(originalName)) {
          if (!renameMap.has(originalName)) {
            const cleanName = generateCleanName(originalName);
            renameMap.set(originalName, cleanName);
            context?.debug?.(`重命名变量: ${originalName} -> ${cleanName}`);
          }
          
          node.name = renameMap.get(originalName)!;
          changed = true;
        }
      }
      
      // 处理函数声明
      if (t.isFunctionDeclaration(node) && node.id) {
        const originalName = node.id.name;
        
        if (shouldRename(originalName)) {
          if (!renameMap.has(originalName)) {
            const cleanName = `func_${counter++}`;
            renameMap.set(originalName, cleanName);
            context?.debug?.(`重命名函数: ${originalName} -> ${cleanName}`);
          }
          
          node.id.name = renameMap.get(originalName)!;
          changed = true;
        }
      }
      
      // 处理变量声明
      if (t.isVariableDeclarator(node) && t.isIdentifier(node.id)) {
        const originalName = node.id.name;
        
        if (shouldRename(originalName)) {
          if (!renameMap.has(originalName)) {
            const cleanName = generateCleanName(originalName);
            renameMap.set(originalName, cleanName);
            context?.debug?.(`重命名变量声明: ${originalName} -> ${cleanName}`);
          }
          
          node.id.name = renameMap.get(originalName)!;
          changed = true;
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

export default variableCleaner;