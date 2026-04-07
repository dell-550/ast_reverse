import traverse from '@babel/traverse';
import type * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

/** 匹配十六进制转义 \xHH 或 Unicode 转义 \uHHHH（含代理对 \uHHHH\uHHHH） */
const ESCAPE_PATTERN = /\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/;

/**
 * 将含有 \xHH 或 \uHHHH 转义序列的字符串字面量标准化为普通字符串。
 * 说明：Babel 解析后 value 已经是解码值，这里主要改写 raw 输出格式。
 */
const hexStringDecoder: Transform = {
  name: 'hexStringDecoder',
  description: '解码字符串字面量中的十六进制转义序列',

  run(ast: t.File, context?: TransformContext): TransformResult {
    let changed = false;

    traverse(ast, {
      StringLiteral(path) {
        const raw = path.node.extra?.raw;
        if (typeof raw !== 'string' || !ESCAPE_PATTERN.test(raw)) {
          return;
        }

        const normalizedRaw = JSON.stringify(path.node.value);
        if (path.node.extra?.raw === normalizedRaw) {
          return;
        }

        path.node.extra = {
          ...(path.node.extra || {}),
          raw: normalizedRaw,
          rawValue: path.node.value,
        };

        changed = true;
        context?.debug?.(`字符串转义已解码: ${raw} -> ${normalizedRaw}`);
      },
    });

    return { changed };
  },
};

export default hexStringDecoder;
