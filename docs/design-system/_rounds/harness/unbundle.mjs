#!/usr/bin/env node
/**
 * unbundle.mjs — explode a claude.ai/design "bundler" standalone HTML into
 * loose files for design-roundtrip integration.
 *
 * Usage:  node unbundle.mjs <standalone.html> <outdir>
 *
 * Bundler format (verified against the round2 return):
 *   - ONE <script type="__bundler/manifest"> — JSON object
 *       { "<uuid>": { data: <base64>, compressed: <bool>, mime: <string> }, ... }
 *     (compressed entries are gzip).
 *   - ONE <script type="__bundler/template"> — a JSON *string* (must be
 *     JSON.parse'd) containing the real HTML document.
 *   - The outer wrapper HTML (loading shell, self-decoder script) is NOT the
 *     prototype — only the decoded template is extracted from.
 *
 * Output layout (everything written strictly inside <outdir>):
 *   assets/   manifest payloads, named <uuid>.<ext> (ext from mime; original
 *             path-like names preferred when recoverable)
 *   index.html  decoded template with uuid refs rewritten to assets/...
 *   styles/NN.css  every <style> block of the template, in order (01, 02, ...)
 *   src/NN.jsx     every *inline* text/babel | text/jsx template script
 *
 * Plain (non-bundler) HTML fallback: when no __bundler/template tag exists the
 * input file itself is treated as the template (styles/ + src/ + index.html copy).
 *
 * Security posture: pure string + zlib parsing. No eval, no dynamic import of
 * extracted code, no network. Asset names are flattened to basenames so a
 * hostile manifest key cannot path-traverse out of <outdir>.
 *
 * node >= 18, zero dependencies.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gunzipSync } from "node:zlib";

const MIME_EXT = {
  "text/javascript": "js",
  "application/javascript": "js",
  "text/jsx": "jsx",
  "text/babel": "jsx",
  "text/css": "css",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "application/json": "json",
  "font/woff2": "woff2",
};

function usage(code = 0) {
  console.log("Usage: node unbundle.mjs <standalone.html> <outdir>");
  console.log("");
  console.log("Explodes a bundler-format standalone HTML (claude.ai/design return)");
  console.log("into <outdir>/{assets,styles,src,index.html}. Falls back to plain");
  console.log("style/script extraction when the file is not bundler-format.");
  process.exit(code);
}

/** All <script type="__bundler/<kind>"> tag bodies, in document order. */
function bundlerTagBodies(html, kind) {
  const re = new RegExp(
    `<script\\b[^>]*type="__bundler/${kind}"[^>]*>([\\s\\S]*?)<\\/script>`,
    "g",
  );
  return [...html.matchAll(re)].map((m) => m[1]);
}

/** First tag body that JSON-parses to the expected shape, or null. */
function parseBundlerJson(html, kind, expect) {
  for (const body of bundlerTagBodies(html, kind)) {
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed === expect || (expect === "object" && parsed !== null)) {
        return parsed;
      }
    } catch {
      /* not this tag — keep looking */
    }
  }
  return null;
}

function extFromMime(mime) {
  return MIME_EXT[(mime || "").split(";")[0].trim()] || "bin";
}

/**
 * Recover an original filename for a manifest uuid, if the template references
 * it via a path-like src/href attribute (e.g. src="app/sidebar.jsx?<uuid>" or
 * a path-like manifest key). Returns a safe basename or null.
 */
function recoverName(uuid, template) {
  // Path-like manifest key: "app/sidebar.jsx" instead of a uuid.
  if (/[/.]/.test(uuid) && !/^[0-9a-f-]{36}$/i.test(uuid)) {
    const b = basename(uuid);
    if (b && b !== "." && b !== "..") return b;
  }
  // src/href attribute whose value embeds the uuid alongside a path-like name.
  const re = new RegExp(`(?:src|href)="([^"]*${uuid}[^"]*)"`, "g");
  for (const m of template.matchAll(re)) {
    const val = m[1];
    if (val === uuid) continue; // bare uuid ref — nothing to recover
    const candidate = basename(val.split(/[?#]/)[0]);
    if (candidate && candidate !== uuid && /\./.test(candidate)) return candidate;
  }
  return null;
}

function writeOut(dir, name, content) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, basename(name)), content);
}

/** Extract <style> blocks and inline jsx/babel scripts from an HTML string. */
function extractTemplateParts(html, outdir, rewrite) {
  // Styles — NN.css in order of appearance, refs rewritten relative to styles/.
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  styles.forEach((m, i) => {
    const nn = String(i + 1).padStart(2, "0");
    writeOut(join(outdir, "styles"), `${nn}.css`, rewrite(m[1], "../assets/"));
  });

  // Inline text/babel | text/jsx scripts — NN.jsx in order of appearance.
  // (External babel scripts point at manifest assets, which land in assets/.)
  const scripts = [
    ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
  ].filter(
    (m) => /type="text\/(?:babel|jsx)"/.test(m[1]) && m[2].trim().length > 0,
  );
  scripts.forEach((m, i) => {
    const nn = String(i + 1).padStart(2, "0");
    writeOut(join(outdir, "src"), `${nn}.jsx`, rewrite(m[2], "../assets/"));
  });

  return { styleCount: styles.length, inlineJsxCount: scripts.length };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) usage(args.length ? 0 : 1);
  if (args.length < 2) usage(1);

  const [inputPath, outdir] = args;
  const html = readFileSync(inputPath, "utf8");
  mkdirSync(outdir, { recursive: true });

  const manifest = parseBundlerJson(html, "manifest", "object") || {};
  const templateRaw = parseBundlerJson(html, "template", "string");

  // --- Decode manifest assets -> assets/ -------------------------------
  const assetNames = {}; // uuid -> final filename in assets/
  const template = templateRaw ?? html;
  for (const [uuid, entry] of Object.entries(manifest)) {
    let buf = Buffer.from(entry.data || "", "base64");
    if (entry.compressed) buf = gunzipSync(buf);
    const name =
      recoverName(uuid, template) || `${uuid}.${extFromMime(entry.mime)}`;
    assetNames[uuid] = name;
    writeOut(join(outdir, "assets"), name, buf);
  }

  // Rewrite uuid references to relative asset paths (prefix varies by depth).
  const rewrite = (content, prefix) => {
    let out = content;
    for (const [uuid, name] of Object.entries(assetNames)) {
      out = out.split(uuid).join(`${prefix}${name}`);
    }
    return out;
  };

  if (templateRaw) {
    // Bundler format: decoded template is the document of record.
    writeFileSync(join(outdir, "index.html"), rewrite(templateRaw, "assets/"));
    const { styleCount, inlineJsxCount } = extractTemplateParts(
      templateRaw,
      outdir,
      rewrite,
    );
    console.log(
      `bundler format: ${Object.keys(manifest).length} assets, ` +
        `${styleCount} style block(s) -> styles/, ` +
        `${inlineJsxCount} inline jsx -> src/, template -> index.html`,
    );
  } else {
    // Plain HTML fallback: extract from the file itself.
    writeFileSync(join(outdir, "index.html"), rewrite(html, "assets/"));
    const { styleCount, inlineJsxCount } = extractTemplateParts(
      html,
      outdir,
      rewrite,
    );
    console.log(
      `plain html (no __bundler/template tag): ${styleCount} style block(s) -> styles/, ` +
        `${inlineJsxCount} inline jsx -> src/, copy -> index.html`,
    );
  }
}

main();
