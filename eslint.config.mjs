import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

// Native flat config (ESLint 9 / Next 16). eslint-config-next exports a flat-config
// array directly, so we spread it instead of going through FlatCompat — the FlatCompat
// path crashes under ESLint 9 ("Converting circular structure to JSON"). `prettier`
// (eslint-config-prettier) comes last so it switches off any stylistic rules the
// configs above would enforce — Prettier owns formatting.
const config = [
  ...next,
  prettier,
  {
    // Tests mock next/image with a plain <img> on purpose — that's not a real page.
    files: ["tests/**/*.{ts,tsx}"],
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    // .claude/ holds Claude Code tooling (e.g. the plugin ensure-hook, a Node .mjs
    // script) — not app source, so it's outside this app-oriented lint config.
    ignores: [".next/**", "node_modules/**", "coverage/**", ".claude/**"],
  },
];

export default config;
