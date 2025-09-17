"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterTransforms = filterTransforms;
function match(name, patterns) {
    if (!patterns || patterns.length === 0)
        return true;
    return patterns.some((p) => (p.endsWith('/*') ? name.startsWith(p.slice(0, -2)) : name === p));
}
function filterTransforms(all, opts) {
    const { include, exclude } = opts;
    return all
        .filter((t) => t.enabledByDefault ?? true)
        .filter((t) => (include ? match(t.name, include) : true))
        .filter((t) => (exclude ? !match(t.name, exclude) : true))
        .sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0));
}
//# sourceMappingURL=registry.js.map