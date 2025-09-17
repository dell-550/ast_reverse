import type { File } from '@babel/types';

export type TransformResult = { edits: number };

export type Transform = {
  name: string;
  description?: string;
  phase?: number;
  enabledByDefault?: boolean;
  run: (ast: File, ctx: TransformContext) => TransformResult;
};

export type TransformContext = {
  options: DeobfuscateOptions;
  debug?: (message: string) => void;
};

export type DeobfuscateOptions = {
  include?: string[];
  exclude?: string[];
  maxPasses?: number;
  foldBinary?: boolean;
  simplifyBoolean?: boolean;
  pipeline?: string[]; // 指定按名称执行的变换顺序（频繁调整时更方便）
  snapshotDir?: string; // 若设置，则在每个变换后输出中间代码
};


