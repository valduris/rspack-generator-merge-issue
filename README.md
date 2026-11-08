# rspack ignores `generator` options from other matching rules

webpack merges the `generator` options of **all** rules that match a module, so `generator` and `type` can live in
different rules. rspack only applies `generator` when it is in the same rule that sets `type`. The other options are
silently dropped, so the build succeeds but the output is different.

```sh
npm install
npm run repro   # node >= 22.18
```

`run.ts` builds the same file (`import url from "./data.json" with { type: "download" }`) with both bundlers and three
`module.rules` layouts. Every layout is expected to emit `data/data.<hash>.json`.

Result with webpack 5.108.4 and rspack 2.3.0 (same with rspack 2.2.9):

| layout | webpack | rspack |
|---|---|---|
| generator rule, then a separate rule with `type` | `data/data.<hash>.json` | `<hash>.json` |
| rule with `type`, then a separate generator rule | `data/data.<hash>.json` | `<hash>.json` |
| generator and `type` in the same rule | `data/data.<hash>.json` | `data/data.<hash>.json` |

## Why it matters

- It is a silent difference from webpack: no error or warning, the files just end up in another place (here the output
  root, named only by hash).
- Real configs split these concerns on purpose. A generic rule per file type sets the filename in one place, and later
  rules (for example import attributes such as `with: { type: "download" }`) only change how the module is handled.
  Moving such a config from webpack to rspack changes the output layout without any signal.
- We found it because a post-build check rejected ~100 unexpected files in the output root. Without such a check the
  files would have been shipped in the wrong place.

Workaround: repeat the `generator` in the rule that sets `type`.
