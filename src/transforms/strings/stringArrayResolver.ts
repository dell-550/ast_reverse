import * as vm from 'vm';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { Transform, TransformContext, TransformResult } from '../../types';

// ─── 1. 从 AST 提取 BZr / XUr 初始化代码（已被 jsFuckDecoder 折叠为数字） ─────

/**
 * 提取 BZr() 和 XUr() 函数体，加上前置变量声明，返回一段可独立运行的 JS 片段。
 * 运行后可从沙箱中读出所有常量值（如 md=6, jA=10, sX=1174 ...）。
 */
function extractConstantInitCode(ast: t.File): string | null {
  let bZrCode: string | null = null;
  let xUrCode: string | null = null;

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (name === 'BZr' || name === 'XUr') {
        const { code } = generate(path.node, { compact: false });
        if (name === 'BZr') bZrCode = code;
        if (name === 'XUr') xUrCode = code;
      }
    },
  });

  if (!bZrCode || !xUrCode) return null;

  return `${bZrCode}\n${xUrCode}\nBZr();\nXUr();`;
}

/**
 * 在 vm 沙箱中运行 BZr+XUr，返回所有赋值的变量（名 → 数值）。
 */
function evalConstantMap(initCode: string): Map<string, number> {
  const sandbox = new Proxy({} as Record<string, any>, {
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });

  try {
    vm.runInNewContext(initCode, sandbox as any, { timeout: 3000 });
  } catch (_) {
    // 部分成功也可用
  }

  const result = new Map<string, number>();
  for (const [k, v] of Object.entries(sandbox as Record<string, any>)) {
    if (typeof v === 'number' && isFinite(v)) result.set(k, v);
  }
  return result;
}

/**
 * 递归求值含标识符引用的表达式（利用已知常量表）
 */
function evalExprWithConstants(node: t.Expression, constants: Map<string, number>, depth = 0): number | undefined {
  if (depth > 16) return undefined;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value ? 1 : 0;
  if (t.isIdentifier(node)) return constants.get(node.name);
  if (t.isUnaryExpression(node)) {
    const arg = evalExprWithConstants(node.argument, constants, depth + 1);
    if (arg === undefined) return undefined;
    switch (node.operator) {
      case '+': return +arg;
      case '-': return -arg;
      case '!': return !arg ? 1 : 0;
      case '~': return ~arg;
      default: return undefined;
    }
  }
  if (t.isBinaryExpression(node)) {
    if (t.isPrivateName(node.left) || t.isPrivateName(node.right)) return undefined;
    const left = evalExprWithConstants(node.left as t.Expression, constants, depth + 1);
    const right = evalExprWithConstants(node.right as t.Expression, constants, depth + 1);
    if (left === undefined || right === undefined) return undefined;
    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': { const r = left / right; return isFinite(r) ? r : undefined; }
      case '%': return left % right;
      case '**': return Math.pow(left, right);
      case '&': return left & right;
      case '|': return left | right;
      case '^': return left ^ right;
      case '<<': return left << right;
      case '>>': return left >> right;
      case '>>>': return left >>> right;
      default: return undefined;
    }
  }
  return undefined;
}

/**
 * 固定点扩展常量表：扫描 AST 中所有赋值表达式，
 * 反复求值直到没有新的常量被发现。
 * excludeFns: 跳过这些函数体内部的赋值（如 BZr/XUr，防止状态机 case 标签值污染）
 */
function expandConstantsFixpoint(
  ast: t.File,
  initial: Map<string, number>,
  excludeFns: Set<string> = new Set(),
): Map<string, number> {
  const constants = new Map<string, number>(initial);
  const assignments: Array<{ name: string; expr: t.Expression }> = [];

  traverse(ast, {
    AssignmentExpression(path) {
      // 跳过 excludeFns 函数体内的赋值
      if (excludeFns.size > 0 && path.findParent(
        p => t.isFunctionDeclaration(p.node) &&
          excludeFns.has((p.node as t.FunctionDeclaration).id?.name ?? ''),
      )) return;
      if (t.isIdentifier(path.node.left)) {
        assignments.push({ name: path.node.left.name, expr: path.node.right as t.Expression });
      }
    },
    VariableDeclarator(path) {
      if (excludeFns.size > 0 && path.findParent(
        p => t.isFunctionDeclaration(p.node) &&
          excludeFns.has((p.node as t.FunctionDeclaration).id?.name ?? ''),
      )) return;
      if (t.isIdentifier(path.node.id) && path.node.init) {
        assignments.push({ name: path.node.id.name, expr: path.node.init as t.Expression });
      }
    },
  });

  // 固定点迭代
  let changed = true;
  while (changed) {
    changed = false;
    for (const { name, expr } of assignments) {
      if (constants.has(name)) continue;
      const val = evalExprWithConstants(expr, constants);
      if (val !== undefined && isFinite(val) && Number.isInteger(val)) {
        constants.set(name, val);
        changed = true;
      }
    }
  }
  return constants;
}

// ─── 2. 在源码中注入 WG 拦截，捕获所有解码结果 ──────────────────────────────

/**
 * 在源码中找到 `WG = function (...)` 赋值，注入拦截器，使所有 WG 调用结果
 * 都被记录到 kJ.__wg_results__[`${arg0},${arg1}`] 中。
 */
/**
 * 创建一个安全的容器 Proxy：未初始化的 key 返回空函数（不抛出）
 * 注入到沙箱源码开头，替换 N8/Z5/LY/rx/zG 等容器的返回对象
 */
const CONTAINER_PROXY_PREAMBLE = `
var __deepFn__ = (function() {
  function __deepFn__() { return __deepFn__; }
  __deepFn__.call = function(_th) { return __deepFn__; };
  __deepFn__.apply = function(_th, _a) { return __deepFn__; };
  __deepFn__.bind = function() { return __deepFn__; };
  __deepFn__.cI = '';
  // 使用独特的非空 key（\x01__df\x01），避免与 '' 冲突（'' 会破坏 [] + [][[] 环境检测）
  __deepFn__.toString = function() { return '\x01__df\x01'; };
  __deepFn__.valueOf = function() { return 0; };
  __deepFn__[Symbol.toPrimitive] = function(hint) { return hint === 'number' ? 0 : '\x01__df\x01'; };
  return __deepFn__;
})();
// 当 __deepFn__ 被当作属性键（如 cG1[__deepFn__]）时，toString 返回 '\x01__df\x01'。
// 注意：sandbox 提供的 Object 是宿主的 Object，而 VM 内部 {} 走的是 VM 自己的 Object.prototype。
// 必须用 ({}).constructor.prototype 拿到 VM 上下文真正的 Object.prototype，才能对所有
// VM 内部对象生效。non-enumerable 避免污染 for-in 遍历。
Object.defineProperty(({}).constructor.prototype, '\x01__df\x01', {
  value: function() { return __deepFn__; },
  writable: true, enumerable: false, configurable: true
});
// Patch VM's Function.prototype[''] for 旧式 rB[''] 调用模式
;(function(){}).constructor.prototype[''] = function() { return __deepFn__; };
var __wg_capture__ = {};
var __mkSafeContainer__ = function(obj) {
  return new Proxy(obj, {
    get: function(t, p) {
      if (typeof p === 'symbol') return t[p];
      if (p in t) return t[p];
      return __deepFn__;
    },
    set: function(t, p, v) { t[p] = v; return true; }
  });
};
// __safeNew__: 将 new SomeClass() 的结果包装为安全 Proxy。
// 当实例方法因 bootstrap 循环依赖未能正常挂载时，访问任何未定义属性返回 __deepFn__ 而不是崩溃。
// in 运算符会遍历完整原型链，已设置的方法仍能正常访问。
var __safeNew__ = function(Ctor) {
  try {
    var instance = new Ctor();
    return new Proxy(instance, {
      get: function(t, p) {
        if (typeof p === 'symbol') return t[p];
        if (p in t) return t[p];
        return __deepFn__;
      },
      set: function(t, p, v) { t[p] = v; return true; }
    });
  } catch(e) { return __deepFn__; }
};
`;

function injectWGInterception(sourceCode: string): string {
  // 1. 在所有容器函数（N8/Z5/LY/rx/zG/Np/Wx/kp）的初始化返回值包上安全 Proxy
  //    匹配模式: function NAME() { var FOO = {}|[]; NAME = function() { return FOO; }; return FOO; }
  let patched = sourceCode.replace(
    /\bfunction\s+(\w+)\s*\(\s*\)\s*\{[\s\n]*var\s+(\w+)\s*=\s*(\{\}|\[\])\s*;[\s\n]*\1\s*=\s*function\s*\(\s*\)\s*\{[\s\n]*return\s+\2\s*;[\s\n]*\}\s*;[\s\n]*return\s+\2\s*;[\s\n]*\}/g,
    (match, fnName, varName, init) =>
      `function ${fnName}() { var ${varName} = __mkSafeContainer__(${init}); ${fnName} = function() { return ${varName}; }; return ${varName}; }`,
  );

  // 1b. 将 `var X = new Y()` 替换为 `var X = __safeNew__(Y)`，
  //     使所有零参数构造的实例访问未定义属性时返回 __deepFn__ 而非崩溃。
  //     只匹配零参数（括号内无内容）以避免影响带参数的构造。
  patched = patched.replace(
    /\bvar\s+(\w+)\s*=\s*new\s+(\w+)\s*\(\s*\)\s*;/g,
    (_m, varName, className) => `var ${varName} = __safeNew__(${className});`,
  );

  // 2. 在代码最顶层注入 __mkSafeContainer__ 工具函数（作为全局变量，两个 IIFE 均可访问）
  patched = CONTAINER_PROXY_PREAMBLE + '\n' + patched;
  console.error('[stringArrayResolver] Preamble prepended at top level');

  // 2b. 调试 kJ，同时在首次 WG decode 调用时把闭包常量写入 __wg_capture__.__consts__
  //     这些变量（Hg, Hb, jA, fp 等）是闭包作用域，只能在此注入点内访问，无法从 sandbox 外读取。
  patched = patched.replace(
    /return kJ\[fG\[Hb\]\]\[fG\[Hg\]\]\(YCr\);/,
    `if (!__wg_capture__.__consts__) {
      try {
        var __snap__ = {};
        // 遍历当前作用域里所有可枚举的数字型变量，存入 __consts__
        // 由于 JS 无法直接枚举闭包变量，这里只捕获已知参与 WG 参数计算的常见变量名
        // 直接引用闭包变量（eval 已被禁用），try-catch 处理变量未定义的情况
        try{if(typeof Hg==='number')__snap__['Hg']=Hg;}catch(e){}
        try{if(typeof Hb==='number')__snap__['Hb']=Hb;}catch(e){}
        try{if(typeof jA==='number')__snap__['jA']=jA;}catch(e){}
        try{if(typeof fp==='number')__snap__['fp']=fp;}catch(e){}
        try{if(typeof Xp==='number')__snap__['Xp']=Xp;}catch(e){}
        try{if(typeof G5==='number')__snap__['G5']=G5;}catch(e){}
        try{if(typeof md==='number')__snap__['md']=md;}catch(e){}
        try{if(typeof KS==='number')__snap__['KS']=KS;}catch(e){}
        try{if(typeof p7==='number')__snap__['p7']=p7;}catch(e){}
        try{if(typeof QY==='number')__snap__['QY']=QY;}catch(e){}
        try{if(typeof cB==='number')__snap__['cB']=cB;}catch(e){}
        try{if(typeof TJ1==='number')__snap__['TJ1']=TJ1;}catch(e){}
        try{if(typeof VO==='number')__snap__['VO']=VO;}catch(e){}
        try{if(typeof Bc==='number')__snap__['Bc']=Bc;}catch(e){}
        try{if(typeof HK==='number')__snap__['HK']=HK;}catch(e){}
        try{if(typeof UT==='number')__snap__['UT']=UT;}catch(e){}
        try{if(typeof d8==='number')__snap__['d8']=d8;}catch(e){}
        try{if(typeof vz1==='number')__snap__['vz1']=vz1;}catch(e){}
        try{if(typeof rE1==='number')__snap__['rE1']=rE1;}catch(e){}
        try{if(typeof xB==='number')__snap__['xB']=xB;}catch(e){}
        try{if(typeof Fk==='number')__snap__['Fk']=Fk;}catch(e){}
        try{if(typeof nd1==='number')__snap__['nd1']=nd1;}catch(e){}
        try{if(typeof W5==='number')__snap__['W5']=W5;}catch(e){}
        try{if(typeof Gx==='number')__snap__['Gx']=Gx;}catch(e){}
        try{if(typeof TJ==='number')__snap__['TJ']=TJ;}catch(e){}
        try{if(typeof JJ==='number')__snap__['JJ']=JJ;}catch(e){}
        try{if(typeof RI==='number')__snap__['RI']=RI;}catch(e){}
        __wg_capture__.__consts__ = __snap__;
      } catch(e) {}
    }
    console.log('[DEBUG Y0] kJ=', typeof kJ, 'fG=', JSON.stringify(fG), 'Hb=', typeof Hb, Hb, 'Hg=', typeof Hg, Hg);
    if (typeof kJ === 'undefined') { return String.fromCharCode(YCr); }
    return kJ[fG[Hb]][fG[Hg]](YCr);`,
  );
  patched = patched.replace(
    /function q1\(\) \{/,
    `function q1() { console.log('[DEBUG q1] called, typeof global=', typeof global, 'typeof window=', typeof window, '[] + [][[]]=', [] + [][[]]);`,
  );
  // Debug q1 body - check actual kJ assignment
  patched = patched.replace(
    /kJ = global;/,
    `kJ = global; console.log('[DEBUG q1] kJ assigned, kJ===global:', kJ === global, 'typeof kJ:', typeof kJ);`,
  );

  // 3. 匹配 WG = function (...) { ... };  （函数体为单层大括号）
  patched = patched.replace(
    /\bWG\s*=\s*(function\s*\([^)]*\)\s*\{[^{}]*\})\s*;/g,
    (_match, fnBody) =>
      // kJ 在 q1() 执行后已指向沙箱全局对象，WG 赋值在 q1/BZr/XUr 之后，故此时 kJ 有效
      `WG = (function(__origFn__) {
        var __results__ = __wg_capture__;
        console.log('[DEBUG WG HOOK] installed, kJ type:', typeof kJ, '__results__ is object:', typeof __results__ === 'object');
        var __hooked__ = function() {
          try {
            var __r__ = __origFn__.apply(this, arguments);
            if (typeof __r__ === 'string') {
              console.log('[DEBUG WG CALL] WG(' + arguments[0] + ',' + arguments[1] + ') = ' + JSON.stringify(__r__).substring(0, 60));
              __results__[String(arguments[0]) + ',' + String(arguments[1])] = __r__;
            } else {
              console.log('[DEBUG WG CALL] WG(' + arguments[0] + ',' + arguments[1] + ') non-string result type:', typeof __r__);
            }
            return __r__;
          } catch (_e) { console.log('[DEBUG WG ERR]', String(_e)); return ''; }
        };
        // sw 在 WG 定义之前已由 Cx q3 分支赋值（执行顺序: SW_SET → CY_CALLED → WG_DEFINED）
        if (typeof dB !== 'undefined' && typeof sw !== 'undefined' && dB[sw] !== undefined) {
          __hooked__.cI = dB[sw];
        } else if (typeof dB !== 'undefined' && dB[296] !== undefined) {
          __hooked__.cI = dB[296];
        }
        WG = __hooked__;
        return __hooked__;
      })(${fnBody});`,
  );
  return patched;
}

// ─── 3. 构建沙箱并运行，返回 WG 调用结果表 ──────────────────────────────────

/**
 * 创建一个"永不报错"的深层 Proxy 对象
 * 用作浏览器 API 的占位符（Navigator, performance 等缺失的全局）
 */
function createDeepMock(): any {
  const mock: any = function () { return createDeepMock(); };
  mock.prototype = {};
  return new Proxy(mock, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'prototype') return mock.prototype;
      if (prop === 'call' || prop === 'apply' || prop === 'bind') return mock;
      if (typeof prop === 'symbol') return undefined;
      return createDeepMock();
    },
    set(_t, _p, _v) { return true; },
    apply(_t, _th, _a) { return createDeepMock(); },
    construct(_t, _a) { return createDeepMock(); },
    has(_t, _p) { return true; },
  });
}

/**
 * VM 运行结果：WG 解码表 + 运行时变量值（用于解析 Z5 调用参数）
 */
interface VMRunResult {
  wgResults: Map<string, string>;
  runtimeConstants: Map<string, number>;
}

function runAndCaptureWG(
  sourceCode: string,
  context?: TransformContext,
): VMRunResult {
  const sandbox: Record<string, any> = {
    // 基本控制
    console: { log: (...args: any[]) => process.stderr.write('[VM] ' + args.join(' ') + '\n'), error: () => {}, warn: () => {}, info: () => {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    // JS 内置
    Math, Date, String, Array, Object, Number, Boolean, RegExp, Error, JSON,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    encodeURI, decodeURI, Symbol, Promise, Proxy, Map, Set, WeakMap, WeakSet,
    Function, eval: undefined, // 禁用 eval
    TypeError, RangeError, ReferenceError, SyntaxError, URIError, EvalError,
    ArrayBuffer, Uint8Array, Int8Array, Int16Array, Int32Array,
    Uint8ClampedArray, Uint16Array, Uint32Array, Float32Array, Float64Array,
    DataView, NaN: NaN, Infinity: Infinity,
    // 浏览器 API 占位（防止 .prototype 等访问报错）
    Navigator: createDeepMock(),
    navigator: createDeepMock(),
    window: null as any,              // 先占位，后面会设为 proxiedSandbox
    document: createDeepMock(),
    location: createDeepMock(),
    history: createDeepMock(),
    performance: createDeepMock(),
    screen: createDeepMock(),
    localStorage: createDeepMock(),
    sessionStorage: createDeepMock(),
    XMLHttpRequest: createDeepMock(),
    fetch: () => Promise.resolve(createDeepMock()),
    WebSocket: createDeepMock(),
    MutationObserver: createDeepMock(),
    IntersectionObserver: createDeepMock(),
    ResizeObserver: createDeepMock(),
    Worker: createDeepMock(),
  };

  // 用 Proxy 包裹 sandbox，使访问任何不存在属性时返回 DeepMock
  // 这样 kJ[garbage_string] 不会抛 TypeError，允许 VM 跑过 N8/Z5/LY
  // 尚未初始化时的调用点（如 case DD），继续直到它们被真正填充
  const proxiedSandbox = new Proxy(sandbox, {
    get(target, prop) {
      if (typeof prop === 'symbol') return (target as any)[prop];
      if (prop in target) return target[prop as string];
      return createDeepMock();
    },
    set(target, prop, value) {
      target[prop as string] = value;
      return true;
    },
    has(_target, _prop) { return true; },
    getPrototypeOf(_target) { return Object.prototype; },
  });

  // global / globalThis / window → sandbox 自身（window 不为 undefined，避免 kJ['window']._cf 崩溃）
  sandbox.global = proxiedSandbox;
  sandbox.globalThis = proxiedSandbox;
  sandbox.window = proxiedSandbox;  // window 也指向 sandbox，q1() 走 window 分支，kJ=proxiedSandbox

  const injected = injectWGInterception(sourceCode);

  // createContext 使 vm 内访问 `global` 时得到 sandbox 自身
  const ctx = vm.createContext(proxiedSandbox);

  try {
    vm.runInContext(injected, ctx, {
      timeout: 20000,
      filename: 'obfuscated.js',
    });
  } catch (_err: any) {
    // 超时 / 运行时错误 —— 部分初始化仍可能已完成
    console.error('[stringArrayResolver] VM error:', _err?.message);
    if (_err?.stack) {
      const lines = _err.stack.split('\n').slice(0, 5).join('\n');
      console.error('[stringArrayResolver] Stack:', lines);
    }
  }

  // ── 读取 WG 解码结果 ──────────────────────────────────────────────────────
  const rawCapture = sandbox['__wg_capture__'];
  console.error('[stringArrayResolver] __wg_capture__ keys count:', rawCapture ? Object.keys(rawCapture).length : 0);
  const wgResults = new Map<string, string>();

  if (rawCapture && typeof rawCapture === 'object') {
    for (const [k, v] of Object.entries(rawCapture as Record<string, any>)) {
      if (typeof v === 'string') wgResults.set(k, v);
    }
    context?.debug?.(`WG 拦截成功：捕获 ${wgResults.size} 条解码结果`);
  } else {
    context?.debug?.('WG 拦截未能捕获结果（可能超时或 WG 未被执行）');
  }

  // ── 从 __wg_capture__.__consts__ 读取 VM 运行时闭包常量 ─────────────────────
  // 这些常量在 WG decode 调用点被注入代码捕获（eval 从闭包中读取），
  // 是唯一能获取到正确运行时值的途径（变量是闭包作用域，sandbox 读不到）。
  const runtimeConstants = new Map<string, number>();
  const capturedConsts = rawCapture && typeof rawCapture === 'object'
    ? (rawCapture as Record<string, any>).__consts__
    : undefined;
  if (capturedConsts && typeof capturedConsts === 'object') {
    for (const [k, v] of Object.entries(capturedConsts as Record<string, any>)) {
      if (typeof v === 'number' && isFinite(v)) {
        runtimeConstants.set(k, v);
      }
    }
    console.error('[stringArrayResolver] runtimeConstants from __consts__:', runtimeConstants.size,
      'Hg=', runtimeConstants.get('Hg'), 'Hb=', runtimeConstants.get('Hb'), 'jA=', runtimeConstants.get('jA'));
  } else {
    console.error('[stringArrayResolver] __consts__ not captured (VM may have crashed before WG decode)');
  }

  return { wgResults, runtimeConstants };
}

// ─── 4. 在 AST 中查找 WG 调用并替换 ─────────────────────────────────────────

// ─── Transform 主体 ───────────────────────────────────────────────────────────

/** Container function names whose 2-arg calls forward directly to WG(arg0, arg1) */
const Z5_CONTAINERS = new Set(['Z5']);

/**
 * 判断是否为容器函数调用 Z5()、N8() 等（无参数调用）
 */
function isContainerCall(node: t.CallExpression, names: Set<string>): boolean {
  return t.isIdentifier(node.callee) && names.has((node.callee as t.Identifier).name) && node.arguments.length === 0;
}

const stringArrayResolver: Transform = {
  name: 'stringArrayResolver',
  description: '通过 vm 沙箱运行 BZr/XUr 提取常量 + 拦截 WG 调用，内联 dB 字符串',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;

    // 1. 提取 BZr/XUr 初始化代码并求值所有常量
    const initCode = extractConstantInitCode(ast);
    if (!initCode) {
      context?.debug?.('stringArrayResolver: 未找到 BZr/XUr 函数，跳过');
      return { changed: false };
    }

    const baseConstants = evalConstantMap(initCode);

    // 1b. 固定点扩展：从空表出发，排除 BZr/XUr 函数体，只收集 v5 状态机赋值
    //     BZr/XUr 给 Hg 赋值 1114（case 标签），v5 才是真正的运行时值（Hg=1）
    const constants = expandConstantsFixpoint(ast, new Map(), new Set(['BZr', 'XUr']));
    context?.debug?.(
      `stringArrayResolver: 常量表 基础=${baseConstants.size} v5扩展=${constants.size} (Hg=${constants.get('Hg')}, Hb=${constants.get('Hb')}, Aw=${constants.get('Aw')})`,
    );

    // 2. 生成当前 AST 对应的源码（经 jsFuckDecoder / wrapperFunctionInliner 处理后）
    const { code: sourceCode } = generate(ast, { compact: false });

    // 3. 注入 WG 拦截并运行 vm 沙箱
    const vmResult = runAndCaptureWG(sourceCode, context);
    const wgResults = vmResult.wgResults;
    const vmRuntimeConstants = vmResult.runtimeConstants;

    if (wgResults.size === 0) {
      context?.debug?.('stringArrayResolver: 未捕获到 WG 解码结果，跳过替换');
      return { changed: false };
    }

    // 以 VM 运行时正确常量（Hg=1, Hb=2, jA=10...）为种子，重跑 fixpoint。
    // 这样所有依赖 Hg/Hb/jA 的派生变量（Aw, VO, TJ1, HK 等）都能用正确值计算，
    // 避免因静态 fixpoint 先拿到错误的状态机 case label 值（Hg=54, Hb=108）导致全链错误。
    const resolveConstants = vmRuntimeConstants.size > 0
      ? expandConstantsFixpoint(ast, vmRuntimeConstants, new Set(['BZr', 'XUr']))
      : new Map([...constants, ...vmRuntimeConstants]);

    context?.debug?.(`stringArrayResolver: resolveConstants=${resolveConstants.size} Hg=${resolveConstants.get('Hg')} Hb=${resolveConstants.get('Hb')}`);

    // 4. 遍历 AST，替换所有 WG 调用模式：
    //    4a. 直接调用: WG(a0, a1)
    //    4b. Z5 容器直接调用: Z5()[expr](a0, a1)
    //    4c. Z5 容器 .call: Z5()[expr].call(null, a0, a1)
    //    4d. Z5 容器 .apply: Z5()[expr].apply(null, [a0, a1])

    function tryResolve(node: t.Expression): number | undefined {
      return evalExprWithConstants(node, resolveConstants);
    }

    function tryReplaceWithKey(path: any, a0val: number | undefined, a1val: number | undefined): boolean {
      if (a0val === undefined || a1val === undefined) return false;
      const key = `${a0val},${a1val}`;
      const decoded = wgResults.get(key);
      if (decoded === undefined) return false;
      path.replaceWith(t.stringLiteral(decoded));
      changed = true;
      context?.debug?.(`WG(${a0val},${a1val}) → "${decoded}"`);
      return true;
    }

    traverse(ast, {
      CallExpression(path) {
        const call = path.node;
        const callee = call.callee;

        // 4a. 直接 WG 调用: WG(a0, a1)
        if (t.isIdentifier(callee, { name: 'WG' }) && call.arguments.length >= 2 && !call.arguments.some(a => t.isSpreadElement(a))) {
          tryReplaceWithKey(path, tryResolve(call.arguments[0] as t.Expression), tryResolve(call.arguments[1] as t.Expression));
          return;
        }

        if (!t.isMemberExpression(callee)) return;
        const calleeME = callee as t.MemberExpression;

        // Check for .call / .apply wrappers: Z5()[expr].call(null, a0, a1)  or  Z5()[expr].apply(null, [a0, a1])
        const prop = calleeME.property;
        const isCall = !calleeME.computed && t.isIdentifier(prop, { name: 'call' });
        const isApply = !calleeME.computed && t.isIdentifier(prop, { name: 'apply' });

        if (isCall || isApply) {
          // callee is Z5()[expr].call or Z5()[expr].apply
          const innerME = calleeME.object;
          if (!t.isMemberExpression(innerME)) return;
          const innerObj = (innerME as t.MemberExpression).object;
          if (!t.isCallExpression(innerObj) || !isContainerCall(innerObj as t.CallExpression, Z5_CONTAINERS)) return;

          if (isCall) {
            // Z5()[expr].call(thisArg, a0, a1) — args[1] and args[2]
            if (call.arguments.length === 3 && !call.arguments.some(a => t.isSpreadElement(a))) {
              tryReplaceWithKey(path, tryResolve(call.arguments[1] as t.Expression), tryResolve(call.arguments[2] as t.Expression));
            }
          } else {
            // Z5()[expr].apply(thisArg, [a0, a1]) — args[1] is ArrayExpression
            if (call.arguments.length === 2 && t.isArrayExpression(call.arguments[1])) {
              const arr = call.arguments[1] as t.ArrayExpression;
              if (arr.elements.length === 2 && !arr.elements.some(e => e === null || t.isSpreadElement(e as any))) {
                tryReplaceWithKey(path, tryResolve(arr.elements[0] as t.Expression), tryResolve(arr.elements[1] as t.Expression));
              }
            }
          }
          return;
        }

        // 4b. Z5 容器直接调用: Z5()[expr](a0, a1)
        if (t.isCallExpression(calleeME.object) && isContainerCall(calleeME.object as t.CallExpression, Z5_CONTAINERS)) {
          if (call.arguments.length === 2 && !call.arguments.some(a => t.isSpreadElement(a))) {
            tryReplaceWithKey(path, tryResolve(call.arguments[0] as t.Expression), tryResolve(call.arguments[1] as t.Expression));
          }
        }
      },
    });

    if (changed) {
      context?.debug?.('stringArrayResolver: WG 调用替换完成');
    }

    return { changed };
  },
};

export default stringArrayResolver;
