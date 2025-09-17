"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_TRANSFORMS = void 0;
const sequenceFlatten_1 = __importDefault(require("./others/sequenceFlatten"));
const binaryFold_1 = __importDefault(require("./expressions/binaryFold"));
const ifElseSimplify_1 = __importDefault(require("./control/ifElseSimplify"));
const forSimplify_1 = __importDefault(require("./loops/forSimplify"));
const whileDoSimplify_1 = __importDefault(require("./loops/whileDoSimplify"));
const switchSimplify_1 = __importDefault(require("./switch/switchSimplify"));
exports.ALL_TRANSFORMS = [
    sequenceFlatten_1.default,
    binaryFold_1.default,
    ifElseSimplify_1.default,
    forSimplify_1.default,
    whileDoSimplify_1.default,
    switchSimplify_1.default,
];
//# sourceMappingURL=index.js.map