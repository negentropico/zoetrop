#!/usr/bin/env node
/**
 * css-delta.mjs — diff a design-roundtrip prototype stylesheet against the
 * app's real stylesheet, so integration only ports what is actually new.
 *
 * Usage:  node css-delta.mjs <prototype.css> [app.css]
 *         app.css defaults to remix-app/app/app.css resolved from the cwd.
 *
 * Emits a markdown report on stdout:
 *   - Custom properties: NEW (prototype only), CHANGED (same name, different
 *     normalized value — both shown), DUPLICATE (identical — safe to skip)
 *   - Selectors: prototype-only ("port these"), in both ("review for conflict")
 *
 * KNOWN LIMITS (crude-but-honest string parsing, not a real CSS parser):
 *   - Comments are stripped, whitespace collapsed, then rules split on brace
 *     boundaries. @media / @supports blocks are descended into, but the media
 *     condition is NOT part of selector identity — the same selector inside
 *     and outside a media query counts once.
 *   - Custom properties redefined per theme (e.g. html[data-theme="dark"]
 *     remaps) are compared as value *sets* per name, not per scope.
 *   - No shorthand expansion, no specificity logic, no value equivalence
 *     beyond whitespace normalization (#fff vs #ffffff counts as CHANGED).
 *
 * node >= 18, zero dependencies.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function usage(code = 0) {
  console.log("Usage: node css-delta.mjs <prototype.css> [app.css]");
  console.log("");
  console.log("Markdown delta report (stdout): NEW / CHANGED / DUPLICATE custom");
  console.log("properties and prototype-only / in-both selectors, prototype vs app.");
  console.log("app.css defaults to remix-app/app/app.css resolved from the cwd.");
  console.log("");
  console.log("Limits: naive string parsing — @media conditions are ignored for");
  console.log("selector identity, per-theme var remaps compare as value sets, and");
  console.log("values are only whitespace-normalized (no real CSS parser).");
  process.exit(code);
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, " ");
const collapse = (s) => s.replace(/\s+/g, " ").trim();

/**
 * Parse a stylesheet (comments pre-stripped) into:
 *   props:     Map<name, Set<normalized value>>
 *   selectors: Set<normalized selector>  (block at-rules descended into;
 *              the at-rule preludes themselves are not selectors)
 */
function parseCss(css) {
  const props = new Map();
  const selectors = new Set();

  // Custom properties — anywhere in the sheet.
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g)) {
    const name = m[1];
    const value = collapse(m[2]).replace(/;$/, "");
    if (!props.has(name)) props.set(name, new Set());
    props.get(name).add(value);
  }

  // Selectors — walk brace structure; descend into block at-rules.
  let buf = "";
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      const prelude = collapse(buf);
      buf = "";
      depth++;
      if (!prelude) continue;
      if (prelude.startsWith("@")) {
        // @media/@supports/etc — descend; prelude is not a selector.
        // (@keyframes frames will surface as e.g. "from"/"0%" — tolerated.)
        continue;
      }
      for (const sel of prelude.split(",")) {
        const s = collapse(sel);
        if (s) selectors.add(s);
      }
    } else if (ch === "}") {
      buf = "";
      if (depth > 0) depth--;
    } else {
      buf += ch;
    }
  }
  return { props, selectors };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) usage(args.length ? 0 : 1);

  const protoPath = args[0];
  const appPath = args[1] || resolve(process.cwd(), "remix-app/app/app.css");

  const proto = parseCss(stripComments(readFileSync(protoPath, "utf8")));
  const app = parseCss(stripComments(readFileSync(appPath, "utf8")));

  const newProps = [];
  const changedProps = [];
  const dupProps = [];
  for (const [name, values] of proto.props) {
    const appValues = app.props.get(name);
    if (!appValues) {
      newProps.push([name, [...values].join(" | ")]);
    } else {
      const allMatch = [...values].every((v) => appValues.has(v));
      if (allMatch) dupProps.push([name, [...values].join(" | ")]);
      else changedProps.push([name, [...values].join(" | "), [...appValues].join(" | ")]);
    }
  }

  const protoOnlySel = [...proto.selectors].filter((s) => !app.selectors.has(s));
  const inBothSel = [...proto.selectors].filter((s) => app.selectors.has(s));

  const lines = [];
  lines.push(`# CSS delta: \`${protoPath}\` vs \`${appPath}\``);
  lines.push("");
  lines.push(
    `Prototype: ${proto.props.size} custom properties, ${proto.selectors.size} selectors. ` +
      `App: ${app.props.size} custom properties, ${app.selectors.size} selectors.`,
  );

  lines.push("", "## NEW custom properties (in prototype, not app — port these)", "");
  if (newProps.length === 0) lines.push("_None._");
  else {
    lines.push("| Property | Prototype value |", "| --- | --- |");
    for (const [n, v] of newProps) lines.push(`| \`${n}\` | \`${v}\` |`);
  }

  lines.push("", "## CHANGED custom properties (same name, different value — decide)", "");
  if (changedProps.length === 0) lines.push("_None._");
  else {
    lines.push("| Property | Prototype | App |", "| --- | --- | --- |");
    for (const [n, p, a] of changedProps) lines.push(`| \`${n}\` | \`${p}\` | \`${a}\` |`);
  }

  lines.push("", "## DUPLICATE custom properties (identical — safe to skip)", "");
  if (dupProps.length === 0) lines.push("_None._");
  else {
    lines.push(`${dupProps.length} properties identical in both:`, "");
    lines.push(dupProps.map(([n]) => `\`${n}\``).join(", "));
  }

  lines.push("", "## Selectors only in prototype (port these)", "");
  if (protoOnlySel.length === 0) lines.push("_None._");
  else for (const s of protoOnlySel) lines.push(`- \`${s}\``);

  lines.push("", "## Selectors in both (review for conflict)", "");
  if (inBothSel.length === 0) lines.push("_None._");
  else for (const s of inBothSel) lines.push(`- \`${s}\``);

  lines.push("");
  console.log(lines.join("\n"));
}

main();
