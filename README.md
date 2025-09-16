# AST解混淆工具

一个基于Node.js和TypeScript的JavaScript AST解混淆工具，用于分析和还原混淆的JavaScript代码。

## 功能特性

- 🔍 **AST解析**: 使用Babel解析器解析JavaScript代码
- 🛠️ **多种变换**: 支持多种解混淆变换规则
- ⚙️ **灵活配置**: 可配置的解混淆选项
- 📝 **代码美化**: 自动格式化输出代码
- 🧪 **扩展性**: 支持自定义变换规则
- 📊 **详细报告**: 提供变换过程和错误信息

## 安装依赖

```bash
npm install
```

## 构建项目

```bash
npm run build
```

## 使用方法

### 命令行使用

```bash
# 处理单个文件
node dist/index.js input.js output.js

# 处理目录
node dist/index.js --dir ./src ./dist

# 使用选项
node dist/index.js input.js output.js --beautify --remove-comments
```

### 编程接口

```typescript
import { ASTDeobfuscator } from './core/ASTDeobfuscator';

const deobfuscator = new ASTDeobfuscator({
  beautify: true,
  simplifyExpressions: true,
  removeUnusedVariables: true,
});

const result = deobfuscator.deobfuscate(obfuscatedCode);
console.log(result.code);
```

## 配置选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `removeComments` | 移除注释 | `true` |
| `beautify` | 美化代码 | `true` |
| `removeUnusedVariables` | 移除未使用的变量 | `true` |
| `simplifyExpressions` | 简化表达式 | `true` |
| `restoreVariableNames` | 还原变量名 | `false` |

## 支持的变换

- **表达式简化**: 简化数学运算和逻辑表达式
- **变量清理**: 移除未使用的变量声明
- **代码美化**: 格式化输出代码
- **注释处理**: 移除或保留注释
- **变量名还原**: 还原混淆的变量名（实验性）

## 项目结构

```
src/
├── core/           # 核心解混淆逻辑
├── types/          # TypeScript类型定义
├── utils/          # 工具函数
├── examples/       # 使用示例
└── index.ts        # 主入口文件
```

## 开发

### 运行开发环境

```bash
npm run dev
```

### 代码检查

```bash
npm run lint
npm run lint:fix
```

### 代码格式化

```bash
npm run format
```

### 运行测试

```bash
npm test
```

## 示例

查看 `src/examples/basic.ts` 文件了解详细的使用示例。

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。
