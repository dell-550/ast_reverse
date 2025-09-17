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
function isBool(e) {
    if (t.isBooleanLiteral(e))
        return e.value;
    if (t.isNullLiteral(e))
        return false;
    return undefined;
}
const whileDoSimplify = {
    name: 'loops/whileDoSimplify',
    description: '移除 while(false) 与展开 do{...}while(false)',
    phase: 31,
    enabledByDefault: true,
    run(ast) {
        let edits = 0;
        (0, traverse_1.default)(ast, {
            WhileStatement(path) {
                const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
                if (v === false) {
                    path.remove();
                    edits++;
                }
            },
            DoWhileStatement(path) {
                const v = t.isExpression(path.node.test) ? isBool(path.node.test) : undefined;
                if (v === false) {
                    const b = path.node.body;
                    if (t.isBlockStatement(b))
                        path.replaceWithMultiple(b.body);
                    else
                        path.replaceWith(b);
                    edits++;
                }
            }
        });
        return { edits };
    }
};
exports.default = whileDoSimplify;
//# sourceMappingURL=whileDoSimplify.js.map