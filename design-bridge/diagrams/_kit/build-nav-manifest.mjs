#!/usr/bin/env node
// CANONICAL generator for the Diagram Navigator manifest (PRX is the source; copy
// verbatim to sibling repos and edit only the CONFIG block below).
//   node _kit/build-nav-manifest.mjs
//
// Builds nav-manifest.js from the filesystem, enriched by each section's
// *-register.dc.html index page (when present). Re-runnable & deterministic.
// Features: register parse (built + planned items) · KNOWN_STATUS whitelist ·
// fidelity-variant grouping (CODE-…-lofi/-hifi/etc. → one item + variants[]) ·
// programme reference rows · null overview. Repos without registers fall back to
// a filesystem-only scan automatically.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, ".."); // docs/diagrams/praxis

// ===================== CONFIG (per-repo: edit only this block) =====================
// Zoetrop spine (00 widest → 12 finest), wellness domain. 00 is the OVERVIEW
// (not a section). NOTE: this pass hand-authors nav-manifest.js (2 built boards +
// planned placeholders, Trouvant-style), so the generator is wired-but-dormant;
// run `node _kit/build-nav-manifest.mjs` once each level grows real *.dc.html
// boards + a *-register.dc.html, and it will overwrite the hand-authored manifest.
const SECTIONS = [
  { dir: "01-lifecycle",          prefix: "L", title: "Lifecycle",          register: "lifecycle-register.dc.html" },
  { dir: "02-service-journeys",   prefix: "U", title: "Service journeys",   register: "journeys-register.dc.html" },
  { dir: "03-mental-models",      prefix: "M", title: "Mental models",      register: "models-register.dc.html" },
  { dir: "04-jobs-to-be-done",    prefix: "J", title: "Jobs to be done",    register: "jtbd-register.dc.html" },
  { dir: "05-flows-of-work",      prefix: "F", title: "Flows of work",      register: "flows-register.dc.html" },
  { dir: "06-service-blueprints", prefix: "B", title: "Service blueprints", register: "blueprints-register.dc.html" },
  { dir: "07-screens",            prefix: "S", title: "Screens",            register: "screens-register.dc.html" },
  { dir: "08-panels",             prefix: "P", title: "Panels",             register: "panels-register.dc.html" },
  { dir: "09-actions",            prefix: "A", title: "Actions",            register: "actions-register.dc.html" },
  { dir: "10-tables",             prefix: "T", title: "Tables",             register: "tables-register.dc.html" },
  { dir: "11-components",         prefix: "C", title: "Components",         register: "components-register.dc.html" },
  { dir: "12-tokens",             prefix: "K", title: "Tokens",             register: "tokens-register.dc.html" },
];
const OVERVIEW = { title: "Programme overview", href: "00-design-programme/programme-overview.dc.html" };
const REFERENCE = [];
const OUTPUT_GLOBAL = "ZOETROP_NAV";
// ==================================================================================

// Status tokens recognised from register chips; anything else (job-codes, labels)
// is ignored so it can't become a bogus status chip.
const KNOWN_STATUS = new Set(["built", "vetted", "planned", "exemplar", "draft", "wip", "done", "mapped", "focal"]);
// Fidelity ladder encoded as a filename suffix, ordered low→high.
const FIDELITY = ["block", "lofi", "hifi", "fullres"];
const FID_LABEL = { block: "block", lofi: "lo-fi", hifi: "hi-fi", fullres: "full" };

const stripTags = (s) => s.replace(/<[^>]*>/g, "");
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
   .replace(/&middot;/g, "·").replace(/&rsquo;/g, "’").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”");
const clean = (s) => decode(stripTags(s)).replace(/\s+/g, " ").trim();

const deKebab = (slug) => { const t = slug.replace(/-/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

// Filename -> { code, slug } e.g. "F01-beat-a-slipping-deadline.dc.html"
function parseFilename(file, prefix) {
  const base = file.replace(/\.dc\.html$/, "");
  const m = base.match(new RegExp(`^(${prefix}\\d+)-(.+)$`));
  return m ? { code: m[1], slug: m[2] } : null;
}

// Parse a register into a map: code -> { title, status, hasAnchor }
function parseRegister(html, prefix) {
  const out = new Map();
  const rowStart = /<(a|div)\b[^>]*\bclass="[a-z]+row"[^>]*>/gi;
  const starts = [];
  let m;
  while ((m = rowStart.exec(html))) starts.push({ idx: m.index, tag: m[1].toLowerCase(), open: m[0] });
  for (let i = 0; i < starts.length; i++) {
    const chunk = html.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : html.length);
    const codeM = chunk.match(new RegExp(`>\\s*(${prefix}\\d+)\\s*<`));
    if (!codeM) continue;
    const code = codeM[1];
    if (out.has(code)) continue;
    const hrefM = starts[i].open.match(/href="([^"]+\.dc\.html)"/);
    const hasAnchor = starts[i].tag === "a" && !!hrefM && !hrefM[1].startsWith("../");
    let title = "";
    // Title = the first 600-weight ~13–14px span (family-agnostic: 'Geist' OR var(--font)).
    const titleM = chunk.match(/font:600 1[34](?:\.\d)?px [^>]*>([^<]+)</);
    if (titleM) title = clean(titleM[1]);
    let status = "";
    const statM = chunk.match(/font:700 8px[^>]*>([^<]+)</);
    if (statM) {
      const tok = clean(statM[1]).split(/[·|]/)[0].trim().toLowerCase();
      if (KNOWN_STATUS.has(tok)) status = tok;
    }
    out.set(code, { title, status, hasAnchor });
  }
  return out;
}

const codeNum = (code) => parseInt(code.replace(/^[A-Za-z]+/, ""), 10);

function buildSection(cfg) {
  const dirPath = join(ROOT, cfg.dir);
  const files = existsSync(dirPath) ? readdirSync(dirPath) : [];
  const builtFiles = files.filter((f) => f.endsWith(".dc.html") && !f.startsWith("_") && f !== cfg.register);

  // Group built files by code; split any fidelity suffix into variants.
  const groups = new Map();
  for (const f of builtFiles) {
    const pf = parseFilename(f, cfg.prefix);
    if (!pf) continue;
    const fm = pf.slug.match(/-(block|lofi|hifi|fullres)$/);
    const fidelity = fm ? fm[1] : null;
    const baseSlug = fm ? pf.slug.slice(0, fm.index) : pf.slug;
    if (!groups.has(pf.code)) groups.set(pf.code, { code: pf.code, baseSlug, files: [] });
    const g = groups.get(pf.code);
    if (!fidelity) g.baseSlug = baseSlug;
    g.files.push({ fidelity, href: `${cfg.dir}/${f}` });
  }

  const items = new Map(); // code -> item
  for (const g of groups.values()) {
    g.files.sort((a, b) => FIDELITY.indexOf(a.fidelity ?? "block") - FIDELITY.indexOf(b.fidelity ?? "block"));
    const primary = g.files.find((f) => !f.fidelity) || g.files[0];
    const item = { code: g.code, title: deKebab(g.baseSlug), href: primary.href, status: "built" };
    if (g.files.length > 1) item.variants = g.files.map((f) => ({ label: f.fidelity ? FID_LABEL[f.fidelity] : "base", href: f.href }));
    items.set(g.code, item);
  }

  // Enrich + append planned from the register (when the section has one).
  const regPath = cfg.register ? join(dirPath, cfg.register) : "";
  let reg = new Map();
  if (cfg.register && existsSync(regPath)) reg = parseRegister(readFileSync(regPath, "utf8"), cfg.prefix);
  for (const [code, info] of reg) {
    if (items.has(code)) {
      const it = items.get(code);
      if (info.title) it.title = info.title;
      if (info.status && info.status !== "built") it.status = info.status;
    } else if (!info.hasAnchor) {
      items.set(code, { code, title: info.title || code, href: null, status: info.status || "planned" });
    }
  }

  const list = [...items.values()].sort((a, b) => codeNum(a.code) - codeNum(b.code));
  const numeric = cfg.dir.match(/^(\d+)/)?.[1] ?? "";
  return {
    code: numeric, slug: cfg.dir, dir: cfg.dir, title: cfg.title,
    registerHref: (cfg.register && existsSync(regPath)) ? `${cfg.dir}/${cfg.register}` : null,
    items: list,
  };
}

const sections = SECTIONS.map(buildSection);

const json = JSON.stringify({ overview: OVERVIEW, reference: REFERENCE, sections }, null, 2);
const banner = `// GENERATED by _kit/build-nav-manifest.mjs — re-run after editing registers/cards.
// Single source of truth for the Diagram Navigator drawer. Hand-edits are OK;
// re-running the generator will overwrite them.\n`;
const body = `${banner}\n;(function (g) {\n  g.${OUTPUT_GLOBAL} = ${json};\n})(typeof window !== "undefined" ? window : globalThis);\n`;
writeFileSync(join(__dirname, "nav-manifest.js"), body);

let built = 0, planned = 0, variants = 0;
for (const s of sections) for (const it of s.items) { it.href ? built++ : planned++; if (it.variants) variants += it.variants.length; }
console.log(`nav-manifest.js written: ${sections.length} sections, ${built} built, ${planned} planned, ${variants} variants`);
for (const s of sections) console.log(`  ${s.code} ${s.title.padEnd(24)} ${s.items.length} items (${s.items.filter((i) => i.href).length} built)`);
