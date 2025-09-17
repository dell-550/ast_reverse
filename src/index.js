#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deobfuscate = deobfuscate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("./core/parser");
const pipeline_1 = require("./core/pipeline");
const registry_1 = require("./core/registry");
const transforms_1 = require("./transforms");
function deobfuscate(code, options = {}) {
    const ast = (0, parser_1.parse)(code);
    const selected = (0, registry_1.filterTransforms)(transforms_1.ALL_TRANSFORMS, options);
    const { ast: out, applied } = (0, pipeline_1.runPipeline)(ast, selected, options);
    return { code: (0, parser_1.print)(out), applied };
}
function ensureDir(p) {
    if (!fs.existsSync(p))
        fs.mkdirSync(p, { recursive: true });
}
if (require.main === module) {
    const args = process.argv.slice(2);
    const input = args[0];
    if (!input) {
        console.error('Usage: node dist/index.js <input.js>');
        process.exit(1);
    }
    const raw = fs.readFileSync(input, 'utf-8');
    const options = {};
    const { code } = deobfuscate(raw, options);
    const parsed = path.parse(input);
    const outFile = path.join('./work/outputs', `${parsed.name}.out${parsed.ext || '.js'}`);
    fs.writeFileSync(outFile, code, 'utf-8');
}
//# sourceMappingURL=index.js.map