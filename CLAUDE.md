# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # Compile TypeScript → dist/
npm run dev         # Run with ts-node (no build needed)
npm start           # Run compiled dist/index.js
npm test            # Run Jest tests
npm run lint        # ESLint on src/**/*.ts
npm run lint:fix    # Auto-fix lint issues
npm run format      # Prettier format
npm run clean       # Remove dist/
```

To run a single test file:
```bash
npx jest src/core/deobfuscator.test.ts
```

## Architecture

This is a modular JavaScript AST deobfuscation framework. The pipeline is:

```
Input JS code → parse() → AST → transform chain → print() → Output JS code
```

### Core Modules (`src/core/`)

- **`parser.ts`** — Thin Babel wrapper. `parse(code)` → Babel AST, `print(ast)` → code string.
- **`deobfuscator.ts`** — Central orchestrator. `Deobfuscator` class registers and runs transforms sequentially on the same AST. High-level `deobfuscate(code, names?, outputPath?)` handles the full pipeline including file I/O.
- **`transformRegistry.ts`** — Singleton registry. All transforms must be registered here. `getDefault()` returns the default active set.

### Transform System (`src/transforms/`)

Each transform implements the `Transform` interface from `src/types.ts`:
```typescript
interface Transform {
  name: string;
  description?: string;
  run(ast: File, context?: TransformContext): TransformResult;
}
```

Currently active transforms:
- `hexStringDecoder` — Decodes `\x41\x42` hex escape sequences to their string values
- `ternaryToIfElse` — Converts `var a = cond ? x : y` → `var a; if (cond) { a = x; } else { a = y; }`

Many transforms are imported but commented out in the registry (arrayFlattener, binaryFold, ifElseSimplify, etc.) — they exist in `dist/` from earlier work.

### Adding a New Transform

1. Create `src/transforms/<category>/<name>.ts` implementing `Transform`
2. Register it in `src/core/transformRegistry.ts` inside `initialize()`
3. Add to `getDefault()` if it should run by default

### CLI Entry Point (`src/index.ts`)

Reads `./src/work/inputs/demo.js`, applies transforms, writes to `./src/work/outputs/demo.js`. The `src/work/inputs/` and `src/work/outputs/` directories are git-ignored.

### Key Dependencies

- `@babel/parser`, `@babel/traverse`, `@babel/types`, `@babel/generator` — AST manipulation
- `ts-jest` — TypeScript Jest runner
- `acorn`, `esprima`, `escodegen` — Alternative parsers (present but not used by core)
