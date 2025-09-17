import type { File } from '@babel/types';

export type Transform = {
  name: string;
  description?: string;
  run: (code: string, ctx?: TransformContext) => TransformResult;
};

export type TransformResult = {
  code: string;
  changed: boolean;
};

export type TransformContext = {
  options?: Record<string, any>;
  debug?: (message: string) => void;
};


