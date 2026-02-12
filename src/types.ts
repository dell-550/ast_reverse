import type { File } from '@babel/types';

export type Transform = {
  name: string;
  description?: string;
  run: (ast: File, ctx?: TransformContext) => TransformResult;
};

export type TransformResult = {
  changed: boolean;
};

export type TransformContext = {
  options?: Record<string, any>;
  debug?: (message: string) => void;
};

