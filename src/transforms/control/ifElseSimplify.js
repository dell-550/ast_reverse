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
function truthy(e) {
    if (t.isBooleanLiteral(e))
        return e.value;
    if (t.isNullLiteral(e))
        return false;
    if (t.isNumericLiteral(e))
        return e.value !== 0 && !Number.isNaN(e.value);
    if (t.isStringLiteral(e))
        return e.value.length > 0;
    return undefined;
}
const ifElseSimplify = {
    name: 'control/ifElseSimplify',
    description: '简化恒真/恒假的 if 语句',
    phase: 20,
    enabledByDefault: true,
    run(ast) {
        let edits = 0;
        (0, traverse_1.default)(ast, {
            IfStatement(path) {
                const { test, consequent, alternate } = path.node;
                if (!t.isExpression(test))
                    return;
                const v = truthy(test);
                if (v === true) {
                    if (t.isBlockStatement(consequent))
                        path.replaceWithMultiple(consequent.body);
                    else
                        path.replaceWith(consequent);
                    edits++;
                }
                else if (v === false) {
                    if (alternate) {
                        if (t.isBlockStatement(alternate))
                            path.replaceWithMultiple(alternate.body);
                        else
                            path.replaceWith(alternate);
                    }
                    else {
                        path.remove();
                    }
                    edits++;
                }
            }
        });
        return { edits };
    }
};
exports.default = ifElseSimplify;
//# sourceMappingURL=ifElseSimplify.js.map