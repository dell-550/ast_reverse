import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform, TransformContext } from '../../types';
import { parse, print } from '../../core/parser';

const variableRenamer: Transform = {
  name: 'variableRenamer',
  description: '重命名变量为更有意义的名称',
  run(code: string, context?: TransformContext) {
    let changed = false;
    const ast = parse(code);
    
    // 简单的变量重命名：将单字母变量重命名为更有意义的名称
    const renameMap = new Map([
      ['a', 'str'],
      ['b', 'text'], 
      ['c', 'temp'],
      ['d', 'num'],
      ['e', 'result'],
      ['f', 'func'],
      ['g', 'global'],
      ['h', 'helper'],
      ['i', 'index'],
      ['j', 'counter']
    ]);
    
    traverse(ast, {
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id)) {
          const oldName = path.node.id.name;
          const newName = renameMap.get(oldName);
          if (newName) {
            // 重命名变量声明
            path.node.id.name = newName;
            
            // 重命名所有引用
            const binding = path.scope.getBinding(oldName);
            if (binding) {
              binding.referencePaths.forEach(refPath => {
                if (t.isIdentifier(refPath.node)) {
                  refPath.node.name = newName;
                }
              });
            }
            
            changed = true;
            context?.debug?.(`重命名变量: ${oldName} -> ${newName}`);
          }
        }
      }
    });
    
    const resultCode = changed ? print(ast) : code;
    return { code: resultCode, changed };
  }
};

export default variableRenamer;