import { rspack } from "@rspack/core";
import * as fs from "node:fs";
import * as path from "node:path";
import webpack from "webpack";

const root = import.meta.dirname;
const generator = { filename: "data/[name].[hash][ext]" };
const download = { with: { type: "download" }, type: "asset/resource" };

// Each case is a `module.rules` list. All of them should emit `data/data.<hash>.json`.
const cases: Record<string, unknown[]> = {
    "1. generator in one rule, type in a later rule": [
        { test: /\.json$/, generator },
        download,
    ],
    "2. type in one rule, generator in a later rule": [
        download,
        { test: /\.json$/, generator },
    ],
    "3. generator and type in the same rule": [
        { test: /\.json$/, ...download, generator },
    ],
};

async function build(bundler: "webpack" | "rspack", rules: unknown[]): Promise<string> {
    const out = path.join(root, "out", bundler);
    fs.rmSync(out, { recursive: true, force: true });
    const run = (bundler === "webpack" ? webpack : rspack) as (config: unknown, callback: (error: Error | null, stats: any) => void) => void;
    await new Promise<void>((resolve, reject) => run({
        context: root,
        mode: "production",
        entry: "./src/index.js",
        output: { path: out, publicPath: "/" },
        module: { rules },
        optimization: { minimize: false },
    }, (error, stats) => error ? reject(error) : stats.hasErrors() ? reject(new Error(stats.toString())) : resolve()));
    return fs.readdirSync(out, { recursive: true }).map(String).filter(f => f.endsWith(".json")).join(", ");
}

let mismatches = 0;
for (const [label, rules] of Object.entries(cases)) {
    const webpackOutput = await build("webpack", rules);
    const rspackOutput = await build("rspack", rules);
    const same = webpackOutput.replace(/\.[0-9a-f]+\.json$/, ".json") === rspackOutput.replace(/\.[0-9a-f]+\.json$/, ".json");
    mismatches += same ? 0 : 1;
    console.log(`${same ? "ok      " : "MISMATCH"} ${label}\n           webpack: ${webpackOutput}\n           rspack:  ${rspackOutput}`);
}
console.log(`\n${mismatches} of ${Object.keys(cases).length} cases differ`);
