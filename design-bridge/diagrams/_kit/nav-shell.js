/* Diagram Navigator — app-shell logic. Vanilla, no build step. CANONICAL kit file
   (PRX is the source; copy verbatim to sibling repos). Reads the manifest named by
   window.NAV_CONFIG.manifest (default PRAXIS_NAV). Hosts cards in an <iframe> and
   owns the history stack via pushState; the drawer never re-renders during
   navigation — only the iframe swaps.
   Supports: reference rows · null overview · fidelity variants · clean-slug AND
   full-filename routing (mixed .html/.dc.html + spaces). */
(function () {
  "use strict";
  // Per-repo config (set window.NAV_CONFIG before this script). Defaults = Praxis.
  var CFG = window.NAV_CONFIG || {};
  var NAV = window[CFG.manifest || "PRAXIS_NAV"];
  if (!NAV) { console.error("[nav] manifest global '" + (CFG.manifest || "PRAXIS_NAV") + "' missing"); return; }

  var LS = CFG.storageKey || "praxis-nav-v1";
  var BP = CFG.wideBreakpoint || 860; // wide breakpoint
  var BRAND = CFG.brand || { name: "Praxis", mark: "P", tag: "Navigator" };

  // ---- icons ----
  var IC = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>'
  };

  // ---- state ----
  var saved = readLS();
  var state = {
    currentHref: null,
    drawerOpen: saved.drawerOpen != null ? saved.drawerOpen : isWide(),
    theme: saved.theme || null,
    expanded: new Set(saved.expanded || [])
  };

  var els = {}, secEls = {};

  // ---- helpers ----
  function isWide() { return window.innerWidth >= BP; }
  function abs(href) { return new URL(href, document.baseURI).href; }
  function encSeg(p) { return p.split("/").map(encodeURIComponent).join("/"); }
  function decSeg(p) { return p.split("/").map(decodeURIComponent).join("/"); }
  // Route = href minus a trailing ".dc.html" (clean slug); any other href (e.g. a
  // bare ".html") is kept whole. Encoded per path-segment so spaces round-trip.
  function hrefToHash(href) { return "#/" + encSeg(/\.dc\.html$/.test(href) ? href.slice(0, -8) : href); }
  function hashToHref(hash) {
    var r = (hash || "").replace(/^#\/?/, "");
    if (!r) return null;
    r = decSeg(r);
    return /\.html$/.test(r) ? r : r + ".dc.html";
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function readLS() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function persist() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        drawerOpen: state.drawerOpen, theme: state.theme,
        route: state.currentHref, expanded: [].slice.call(state.expanded)
      }));
    } catch (e) {}
  }

  // lookups
  function findItem(href) {
    for (var i = 0; i < NAV.sections.length; i++) {
      var s = NAV.sections[i];
      for (var j = 0; j < s.items.length; j++) {
        var it = s.items[j];
        if (it.href === href) return { sec: s, item: it };
        if (it.variants) for (var k = 0; k < it.variants.length; k++) if (it.variants[k].href === href) return { sec: s, item: it, variant: it.variants[k] };
      }
    }
    return null;
  }
  function sectionForHref(href) {
    var slug = href.split("/")[0];
    for (var i = 0; i < NAV.sections.length; i++) if (NAV.sections[i].slug === slug) return NAV.sections[i];
    return null;
  }
  function firstHref() {
    for (var i = 0; i < NAV.sections.length; i++)
      for (var j = 0; j < NAV.sections[i].items.length; j++)
        if (NAV.sections[i].items[j].href) return NAV.sections[i].items[j].href;
    return null;
  }

  // ---- build chrome ----
  function build() {
    els.fab = el("button", "menu-fab",
      '<span class="ic-open">' + IC.menu + '</span><span class="ic-close">' + IC.x + '</span>');
    els.fab.setAttribute("aria-label", "Toggle navigator");
    els.fab.setAttribute("aria-expanded", "false");
    els.fab.addEventListener("click", function () { setDrawer(!state.drawerOpen); });

    els.scrim = el("div", "scrim");
    els.scrim.addEventListener("click", function () { setDrawer(false); });

    els.wrap = el("div", "canvas-wrap");
    els.frame = el("iframe", "canvas");
    els.frame.setAttribute("title", "Diagram canvas");
    els.frame.addEventListener("load", onFrameLoad);
    els.wrap.appendChild(els.frame);

    els.drawer = el("aside", "drawer");
    els.drawer.appendChild(buildHead());
    els.tree = el("nav", "tree");
    buildTree();
    els.drawer.appendChild(els.tree);
    els.drawer.appendChild(buildFoot());

    document.body.appendChild(els.wrap);
    document.body.appendChild(els.scrim);
    document.body.appendChild(els.drawer);
    document.body.appendChild(els.fab);
  }

  function buildHead() {
    var head = el("div", "drawer-head");
    head.appendChild(el("div", "brand",
      '<span class="mark">' + esc(BRAND.mark) + '</span><span class="word">' + esc(BRAND.name) +
      '</span><span class="tag">' + esc(BRAND.tag) + '</span>'));
    if (NAV.overview) {
      els.overview = el("button", "overview-row", '<span class="dot"></span><span>Overview</span>');
      els.overview.addEventListener("click", function () { navigate(NAV.overview.href, "push"); });
      head.appendChild(els.overview);
    }
    els.refs = [];
    (NAV.reference || []).forEach(function (r) {
      var btn = el("button", "overview-row", '<span class="dot"></span><span>' + esc(r.title) + '</span>');
      btn._href = r.href;
      btn.addEventListener("click", function () { navigate(r.href, "push"); });
      head.appendChild(btn);
      els.refs.push(btn);
    });
    els.crumb = el("div", "crumb");
    head.appendChild(els.crumb);
    return head;
  }

  function buildTree() {
    NAV.sections.forEach(function (s) {
      var sec = el("div", "sec");
      if (state.expanded.has(s.slug)) sec.classList.add("open");

      var row = el("div", "sec-row");
      var tw = el("button", "twisty" + (s.items.length ? "" : " empty"), IC.chev);
      tw.setAttribute("aria-label", "Expand " + s.title);
      tw.addEventListener("click", function (e) { e.stopPropagation(); toggleSection(s.slug); });
      row.appendChild(tw);
      row.appendChild(el("span", "sec-code", s.code));
      row.appendChild(el("span", "sec-title", s.title));
      if (s.items.length) row.appendChild(el("span", "sec-count", String(s.items.length)));
      row.addEventListener("click", function () {
        if (s.registerHref) { navigate(s.registerHref, "push"); toggleSection(s.slug, true); }
        else toggleSection(s.slug);
      });
      sec.appendChild(row);
      sec._row = row;

      var items = el("div", "sec-items");
      var inner = el("div", "inner");
      var pad = el("div", "items-pad");
      s.items.forEach(function (it) {
        var nav = !!it.href;
        var node = el(nav ? "a" : "div", "item" + (nav ? "" : " disabled"));
        if (nav) { node.href = hrefToHash(it.href); node._href = it.href; }
        node.appendChild(el("span", "item-code", it.code));
        node.appendChild(el("span", "item-title", it.title));
        var chip = el("span", "chip", it.status); chip.setAttribute("data-s", it.status); node.appendChild(chip);
        if (nav) node.addEventListener("click", function (e) { e.preventDefault(); navigate(it.href, "push"); });
        pad.appendChild(node);
        if (it.variants && it.variants.length > 1) {
          var vrow = el("div", "variants");
          it.variants.forEach(function (v) {
            var pill = el("button", "vpill", esc(v.label));
            pill._href = v.href;
            pill.addEventListener("click", function (e) { e.stopPropagation(); navigate(v.href, "push"); });
            vrow.appendChild(pill);
          });
          pad.appendChild(vrow);
        }
      });
      inner.appendChild(pad); items.appendChild(inner); sec.appendChild(items);
      secEls[s.slug] = sec;
      els.tree.appendChild(sec);
    });
  }

  function buildFoot() {
    var foot = el("div", "drawer-foot");
    els.theme = el("button", "foot-btn", IC.moon + "<span>Theme</span>");
    els.theme.addEventListener("click", function () { setTheme(curTheme() === "dark" ? "light" : "dark"); });
    els.raw = el("a", "foot-btn", IC.ext + "<span>Open raw</span>");
    els.raw.target = "_blank"; els.raw.rel = "noopener";
    foot.appendChild(els.theme); foot.appendChild(els.raw);
    return foot;
  }

  // ---- drawer ----
  function setDrawer(open) {
    state.drawerOpen = open;
    document.body.classList.toggle("drawer-open", open);
    els.fab.setAttribute("aria-expanded", String(open));
    persist();
  }
  function toggleSection(slug, force) {
    var sec = secEls[slug]; if (!sec) return;
    var open = force === undefined ? !sec.classList.contains("open") : force;
    sec.classList.toggle("open", open);
    if (open) state.expanded.add(slug); else state.expanded.delete(slug);
    persist();
  }

  // ---- theme ----
  function curTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function applyThemeTo(docEl) { if (state.theme) docEl.setAttribute("data-theme", state.theme); else docEl.removeAttribute("data-theme"); }
  function setTheme(t) { state.theme = t; applyThemeTo(document.documentElement); applyThemeToFrame(); persist(); }
  function applyThemeToFrame() { try { applyThemeTo(els.frame.contentDocument.documentElement); } catch (e) {} }

  // ---- navigation ----
  function navigate(href, mode) {
    if (!href) return;
    loadFrame(href);
    state.currentHref = href;
    var hash = hrefToHash(href);
    if (mode === "push" && location.hash !== hash) history.pushState({ href: href }, "", hash);
    else if (mode === "replace") history.replaceState({ href: href }, "", hash);
    syncActive(href);
    expandForHref(href);
    updateCrumb(href);
    els.raw.href = abs(href);
    persist();
    if (!isWide() && mode === "push") setDrawer(false);
  }
  function loadFrame(href) {
    var url = abs(href);
    try { els.frame.contentWindow.location.replace(url); }
    catch (e) { els.frame.setAttribute("src", url); }
  }
  function onFrameLoad() {
    applyThemeToFrame();
    try { els.frame.contentDocument.addEventListener("keydown", onKeydown); } catch (e) {}
  }
  function expandForHref(href) {
    var s = sectionForHref(href); if (s) toggleSection(s.slug, true);
    var active = els.tree.querySelector(".item.active, .sec-row.active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }
  function syncActive(href) {
    var prev = els.tree.querySelectorAll(".item.active, .sec-row.active, .vpill.active");
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove("active");
    if (els.overview) els.overview.classList.toggle("active", !!NAV.overview && href === NAV.overview.href);
    if (els.refs) els.refs.forEach(function (b) { b.classList.toggle("active", href === b._href); });
    var hit = findItem(href);
    if (hit) {
      var nodes = els.tree.querySelectorAll(".item");
      for (var j = 0; j < nodes.length; j++) if (nodes[j]._href === hit.item.href) { nodes[j].classList.add("active"); break; }
      var pills = els.tree.querySelectorAll(".vpill");
      for (var p = 0; p < pills.length; p++) if (pills[p]._href === href) pills[p].classList.add("active");
    } else {
      var s = sectionForHref(href);
      if (s && s.registerHref === href && secEls[s.slug]) secEls[s.slug]._row.classList.add("active");
    }
  }
  function updateCrumb(href) {
    var html = "";
    if (NAV.overview && href === NAV.overview.href) html = "<b>Overview</b>";
    else if ((NAV.reference || []).some(function (r) { return r.href === href; })) {
      html = "<b>" + esc((NAV.reference.filter(function (r) { return r.href === href; })[0] || {}).title || "") + "</b>";
    }
    else {
      var s = sectionForHref(href);
      if (s && s.registerHref === href) html = "<b>" + esc(s.title) + "</b> ▸ Index";
      else { var hit = findItem(href); if (hit) html = "<b>" + esc(hit.sec.title) + "</b> ▸ " + esc(hit.item.title) + (hit.variant ? " · " + esc(hit.variant.label) : ""); else html = esc(href); }
    }
    els.crumb.innerHTML = html;
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  // ---- keyboard ----
  function onKeydown(e) {
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
    if (e.key === "\\") { e.preventDefault(); setDrawer(!state.drawerOpen); }
    else if (e.key === "Escape" && state.drawerOpen) { setDrawer(false); }
  }

  // ---- history / resize ----
  function applyLocation() {
    var href = hashToHref(location.hash) || (NAV.overview ? NAV.overview.href : firstHref());
    if (!href || href === state.currentHref) return;
    navigate(href, "none");
  }
  function onResize() {
    var wide = isWide();
    document.body.classList.toggle("wide", wide);
  }

  // ---- init ----
  function init() {
    document.body.classList.toggle("wide", isWide());
    applyThemeTo(document.documentElement);
    build();
    setDrawer(state.drawerOpen);
    window.addEventListener("popstate", applyLocation);
    window.addEventListener("hashchange", applyLocation);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKeydown);
    var start = hashToHref(location.hash) || saved.route || (NAV.overview ? NAV.overview.href : firstHref());
    if (start) navigate(start, "replace");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
