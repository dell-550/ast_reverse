import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';
import { parse, print } from '../../core/parser';

/**
 * 数组展开模块
 * 将分散的数组元素重新组合成完整的字符串或表达式
 */
const arrayFlattener: Transform = {
  name: 'arrayFlattener',
  description: '展开和合并数组中的字符串元素',
  
  run(code: string, context?: TransformContext): TransformResult {
    const ast = parse(code);
    let changed = false;
    
    function tryFlattenArray(elements: any[]): string | null {
      // 检查是否所有元素都是字符串字面量
      const allStrings = elements.every(el => 
        t.isStringLiteral(el) || t.isNumericLiteral(el)
      );
      
      if (!allStrings) return null;
      
      // 合并所有字符串
      const combined = elements.map(el => {
        if (t.isStringLiteral(el)) return el.value;
        if (t.isNumericLiteral(el)) return el.value.toString();
        return '';
      }).join('');
      
      return combined;
    }
    
    function visitNode(node: any) {
      // 处理数组表达式
      if (t.isArrayExpression(node) && node.elements.length > 0) {
        const flattened = tryFlattenArray(node.elements);
        if (flattened !== null) {
          // 将数组替换为字符串字面量
          Object.assign(node, t.stringLiteral(flattened));
          changed = true;
          context?.debug?.(`展开数组: [${node.elements.length}个元素] -> "${flattened}"`);
          return;
        }
      }
      
      // 处理数组访问表达式 arr[0] + arr[1] + ...
      if (t.isBinaryExpression(node) && node.operator === '+') {
        const leftIsArrayAccess = t.isMemberExpression(node.left) && 
          !node.left.computed && t.isNumericLiteral(node.left.property);
        const rightIsArrayAccess = t.isMemberExpression(node.right) && 
          !node.right.computed && t.isNumericLiteral(node.right.property);
          
        if (leftIsArrayAccess && rightIsArrayAccess) {
          // 检查是否访问同一个数组的连续索引
          const leftMember = node.left as t.MemberExpression;
          const rightMember = node.right as t.MemberExpression;
          
          if (t.isIdentifier(leftMember.object) && t.isIdentifier(rightMember.object) &&
              leftMember.object.name === rightMember.object.name) {
            const leftIndex = (leftMember.property as t.NumericLiteral).value;
            const rightIndex = (rightMember.property as t.NumericLiteral).value;
            
            if (rightIndex === leftIndex + 1) {
              context?.debug?.(`发现连续数组访问: ${leftMember.object.name}[${leftIndex}] + ${rightMember.object.name}[${rightIndex}]`);
              // 这里可以进一步优化，需要找到数组定义并合并
            }
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

export default arrayFlattener;