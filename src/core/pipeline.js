"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const parser_1 = require("./parser");
function runPipeline(ast, transforms, options) {
    const maxPasses = options.maxPasses ?? 3;
    const applied = [];
    for (let pass = 1; pass <= maxPasses; pass++) {
        let passEdits = 0;
        for (const tr of transforms) {
            const before = (0, parser_1.print)(ast);
            const { edits } = tr.run(ast, { options });
            const after = (0, parser_1.print)(ast);
            if (edits > 0 || before !== after) {
                applied.push(`${tr.name}@${pass}+${edits}`);
                passEdits += edits;
            }
        }
        if (passEdits === 0)
            break;
    }
    return { ast, applied };
}
//# sourceMappingURL=pipeline.js.map