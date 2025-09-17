# AST 解混淆框架

一个模块化的 JavaScript 代码解混淆框架，提供独立可组合的解混淆模块，让开发者可以根据需要自定义处理流程。

## 特性

- **模块化设计**：每个解混淆功能都是独立的模块
- **灵活组合**：开发者可以自由选择和组合需要的模块
- **简单易用**：提供简洁的 API 接口
- **可扩展**：易于添加新的解混淆模块

## 安装

```bash
npm install
npm run build
```

## 快速开始

```javascript
const {
  parseCode,
  generateCode,
  stringDecoder,
  deadCodeElimination,
  applyTransform
} = require('./dist/index.js');

// 解析混淆代码
const ast = parseCode('var a = "\\x48\\x65\\x6c\\x6c\\x6f";');

// 应用字符串解码
applyTransform(ast, stringDecoder);

// 生成解混淆后的代码
const result = generateCode(ast);
console.log(result); // var a = "Hello";
```

## 可用模块

### 字符串处理
- **stringDecoder**: 解码十六进制、Unicode、八进制编码的字符串

### 数组处理
- **arrayFlattener**: 展开和简化数组操作

### 表达式简化
- **binaryFold**: 计算和简化二元表达式

### 控制流优化
- **sequenceFlatten**: 展开序列表达式
- **ifElseSimplify**: 简化条件语句
- **forSimplify**: 简化 for 循环
- **whileDoSimplify**: 简化 while 循环
- **switchSimplify**: 简化 switch 语句

### 代码优化
- **deadCodeElimination**: 移除死代码和未使用的变量
- **variableRenamer**: 将混淆的变量名还原为有意义的名称

## 使用方式

### 1. 单独应用变换

```javascript
const { parseCode, generateCode, stringDecoder, applyTransform } = require('./dist/index.js');

const ast = parseCode(obfuscatedCode);
const result = applyTransform(ast, stringDecoder);

if (result.changed) {
  console.log('字符串解码完成');
  console.log(generateCode(ast));
}
```

### 2. 批量应用变换

```javascript
const { parseCode, generateCode, applyTransforms } = require('./dist/index.js');
const { stringDecoder, deadCodeElimination, variableRenamer } = require('./dist/index.js');

const ast = parseCode(obfuscatedCode);
const transforms = [stringDecoder, deadCodeElimination, variableRenamer];

const result = applyTransforms(ast, transforms);
console.log(`应用了 ${result.appliedCount} 个变换`);
console.log(generateCode(ast));
```

### 3. 自定义处理流程

```javascript
const { parseCode, generateCode } = require('./dist/index.js');
const { stringDecoder, binaryFold, deadCodeElimination } = require('./dist/index.js');

function customDeobfuscate(code) {
  const ast = parseCode(code);
  const context = { debug: console.log };
  
  // 第一阶段：基础解码
  stringDecoder.run(ast, context);
  
  // 第二阶段：表达式优化
  binaryFold.run(ast, context);
  
  // 第三阶段：清理优化
  deadCodeElimination.run(ast, context);
  
  return generateCode(ast);
}

const result = customDeobfuscate(obfuscatedCode);
console.log(result);
```

## API 参考

### 核心函数

- `parseCode(code: string)`: 将 JavaScript 代码解析为 AST
- `generateCode(ast: Node)`: 将 AST 生成为 JavaScript 代码
- `applyTransform(ast: Node, transform: Transform, context?: TransformContext)`: 应用单个变换
- `applyTransforms(ast: Node, transforms: Transform[], context?: TransformContext)`: 批量应用变换

### Transform 接口

每个变换模块都实现了 `Transform` 接口：

```typescript
interface Transform {
  name: string;
  description: string;
  run(ast: Node, context: TransformContext): TransformResult;
}

interface TransformResult {
  changed: boolean;
}

interface TransformContext {
  debug?: (message: string) => void;
  options?: Record<string, any>;
}
```

## 示例

查看 `example.js` 文件了解完整的使用示例：

```bash
node example.js
```

## 扩展框架

要添加新的解混淆模块：

1. 在 `src/transforms/` 下创建新的模块文件
2. 实现 `Transform` 接口
3. 在 `src/transforms/index.ts` 中导出模块
4. 在 `src/index.ts` 中添加导出

```typescript
// src/transforms/custom/myTransform.ts
import * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

const myTransform: Transform = {
  name: 'myTransform',
  description: '我的自定义变换',
  
  run(ast, context: TransformContext): TransformResult {
    let changed = false;
    
    // 实现变换逻辑
    
    return { changed };
  }
};

export default myTransform;
```

## 构建

```bash
npm run build
```

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。
