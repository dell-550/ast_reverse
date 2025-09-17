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
function isFalse(expr) {
    if (!expr)
        return false;
    if (t.isBooleanLiteral(expr))
        return expr.value === false;
    if (t.isNumericLiteral(expr))
        return expr.value === 0 || Number.isNaN(expr.value);
    if (t.isNullLiteral(expr))
        return true;
    return false;
}
const forSimplify = {
    name: 'loops/forSimplify',
    description: '移除恒假 for 或空体 for',
    phase: 30,
    enabledByDefault: true,
    run(ast) {
        let edits = 0;
        (0, traverse_1.default)(ast, {
            ForStatement(path) {
                const { test, body } = path.node;
                if (t.isBlockStatement(body) && body.body.length === 0) {
                    const repl = [];
                    if (path.node.init)
                        repl.push(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
                    path.replaceWithMultiple(repl);
                    edits++;
                    return;
                }
                if (test && isFalse(test)) {
                    if (path.node.init)
                        path.replaceWith(t.isVariableDeclaration(path.node.init) ? path.node.init : t.expressionStatement(path.node.init));
                    else
                        path.remove();
                    edits++;
                }
            }
        });
        return { edits };
    }
};
exports.default = forSimplify;
//# sourceMappingURL=forSimplify.js.map