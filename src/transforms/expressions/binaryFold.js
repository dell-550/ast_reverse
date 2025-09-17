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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const allowed = new Set(['+', '-', '*', '/', '%', '<<', '>>', '>>>', '|', '&', '^', '===', '!==', '==', '!=', '<', '<=', '>', '>=']);
const binaryFold = {
    name: 'expressions/binaryFold',
    description: '常量二元表达式折叠',
    phase: 10,
    enabledByDefault: true,
    run(ast) {
        let edits = 0;
        (0, traverse_1.default)(ast, {
            BinaryExpression(path) {
                const { left, right, operator } = path.node;
                if (!allowed.has(operator))
                    return;
                if (t.isLiteral(left) && t.isLiteral(right)) {
                    try {
                        // eslint-disable-next-line no-eval
                        const v = eval(`${JSON.stringify(left.value)} ${operator} ${JSON.stringify(right.value)}`);
                        const lit = typeof v === 'string' ? t.stringLiteral(v)
                            : typeof v === 'number' ? t.numericLiteral(v)
                                : typeof v === 'boolean' ? t.booleanLiteral(v)
                                    : v === null ? t.nullLiteral() : null;
                        if (lit) {
                            path.replaceWith(lit);
                            edits++;
                        }
                    }
                    catch { }
                }
            }
        });
        return { edits };
    }
};
exports.default = binaryFold;
//# sourceMappingURL=binaryFold.js.map