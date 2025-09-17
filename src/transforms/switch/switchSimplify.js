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
function constValue(n) {
    if (t.isStringLiteral(n) || t.isNumericLiteral(n) || t.isBooleanLiteral(n))
        return n.value;
    if (t.isNullLiteral(n))
        return null;
    return undefined;
}
const switchSimplify = {
    name: 'switch/switchSimplify',
    description: '当 discriminant 为字面量时折叠到匹配分支',
    phase: 40,
    enabledByDefault: true,
    run(ast) {
        let edits = 0;
        (0, traverse_1.default)(ast, {
            SwitchStatement(path) {
                const disc = path.node.discriminant;
                if (!t.isExpression(disc))
                    return;
                const v = constValue(disc);
                if (v === undefined)
                    return;
                let target = null;
                for (const c of path.node.cases) {
                    if (!c.test && target === null)
                        target = c;
                    else if (c.test && t.isExpression(c.test)) {
                        const cv = constValue(c.test);
                        if (cv === v) {
                            target = c;
                            break;
                        }
                    }
                }
                if (target) {
                    const body = [];
                    for (const s of target.consequent) {
                        if (t.isBreakStatement(s))
                            break;
                        body.push(s);
                    }
                    if (body.length === 0)
                        path.remove();
                    else
                        path.replaceWithMultiple(body);
                    edits++;
                }
            }
        });
        return { edits };
    }
};
exports.default = switchSimplify;
//# sourceMappingURL=switchSimplify.js.map