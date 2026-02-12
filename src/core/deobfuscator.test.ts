import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  deobfuscate,
  deobfuscateFromConfig,
  deobfuscateWithOptions,
  deobfuscator,
  loadDeobfuscateConfig,
} from './deobfuscator';

describe('deobfuscator pipeline', () => {
  it('runs configured transforms in order', () => {
    const input = "var a = '\\x41'; var b = ok ? '\\x42' : '\\x43';";
    const result = deobfuscate(input, ['ternaryToIfElse', 'hexStringDecoder']);

    expect(result.appliedCount).toBe(2);
    expect(result.totalTransforms).toBe(2);
    expect(result.transformOrder).toEqual(['ternaryToIfElse', 'hexStringDecoder']);
    expect(result.appliedTransforms).toEqual(['ternaryToIfElse', 'hexStringDecoder']);
    expect(result.code).toMatch(/['"]A['"]/);
    expect(result.code).toMatch(/['"]B['"]/);
    expect(result.code).toMatch(/['"]C['"]/);
    expect(result.code).toContain('if (ok)');
  });

  it('supports options API with output writing', () => {
    const input = "var a = '\\x7a\\x54\\x56';";
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-reverse-'));
    const outputPath = path.join(tempDir, 'out.js');

    const result = deobfuscateWithOptions(input, {
      transforms: ['hexStringDecoder'],
      outputPath,
    });

    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe(result.code);
    expect(result.transformOrder).toEqual(['hexStringDecoder']);
    expect(result.appliedTransforms).toEqual(['hexStringDecoder']);
  });

  it('uses default transforms when none are passed', () => {
    const input = 'var a = flag ? 1 : 2;';
    const result = deobfuscator().run(input);

    expect(result.appliedCount).toBe(1);
    expect(result.code).toContain('if (flag)');
  });

  it('loads and validates config file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-reverse-config-'));
    const configPath = path.join(tempDir, 'deobfuscate.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          inputPath: './src/work/inputs/demo.js',
          transforms: ['hexStringDecoder'],
        },
        null,
        2
      )
    );

    const config = loadDeobfuscateConfig(configPath);
    expect(config.transforms).toEqual(['hexStringDecoder']);
  });

  it('runs deobfuscation from config file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-reverse-config-run-'));
    const inputPath = path.join(tempDir, 'input.js');
    const outputPath = path.join(tempDir, 'output.js');
    const configPath = path.join(tempDir, 'deobfuscate.config.json');

    fs.writeFileSync(inputPath, "var a = '\\x7a\\x54\\x56';");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          inputPath,
          outputPath,
          transforms: ['hexStringDecoder'],
          writeFile: true,
        },
        null,
        2
      )
    );

    const result = deobfuscateFromConfig(configPath);
    expect(result.appliedCount).toBe(1);
    expect(result.totalTransforms).toBe(1);
    expect(result.transformOrder).toEqual(['hexStringDecoder']);
    expect(result.appliedTransforms).toEqual(['hexStringDecoder']);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf-8')).toContain('zTV');
  });

  it('emits execution logs when debug is enabled', () => {
    const logs: string[] = [];
    const input = "var a = '\\x41';";
    const result = deobfuscateWithOptions(input, {
      transforms: ['hexStringDecoder'],
      context: {
        debug: (message: string) => logs.push(message),
      },
    });

    expect(result.appliedCount).toBe(1);
    expect(logs.some((msg) => msg.includes('准备执行 transforms (1)'))).toBe(true);
    expect(logs.some((msg) => msg.includes('执行 transform: hexStringDecoder'))).toBe(
      true
    );
    expect(logs.some((msg) => msg.includes('解混淆完成: 应用 1/1 个 transforms'))).toBe(
      true
    );
  });
});
