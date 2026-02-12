import traverse from '@babel/traverse';
import type * as t from '@babel/types';
import { Transform, TransformContext, TransformResult } from '../../types';

const HEX_ESCAPE_PATTERN = /\\x[0-9a-fA-F]{2}/;

/**
 * 将形如 '\x30\x78\x35\x31\x33' 的字符串字面量标准化为普通字符串 "0x513"。
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
        if (typeof raw !== 'string' || !HEX_ESCAPE_PATTERN.test(raw)) {
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
        context?.debug?.(`字符串十六进制转义已解码: ${raw} -> ${normalizedRaw}`);
      },
    });

    return { changed };
  },
};

export default hexStringDecoder;
