import * as parser from '@babel/parser';
import generate from '@babel/generator';
import type { File } from '@babel/types';

export function parse(code: string): File {
  return parser.parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    plugins: ['jsx', 'typescript'],
  });
}

export function print(ast: File): string {
  return generate(ast, { comments: false, compact: false }).code;
}


