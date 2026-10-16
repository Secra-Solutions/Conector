// Conector panel: copy buttons, confirmations, mobile sidebar, command palette (⌘K), app filters, agent install
// drawer (creates a token and fills it into the snippets), toasts and the Microsoft device-code polling.
(() => {
  document.documentElement.classList.remove("no-js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const csrf = () => $('input[name="csrf"]')?.value || "";
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  // ---------------------------------------------------------------- copy
  async function copyText(text) {
    if (window.isSecureContext && navigator.clipboard) return navigator.clipboard.writeText(text);
    const area = Object.assign(document.createElement("textarea"), { value: text });
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-copy]");
    if (!btn) return;
    const target = btn.dataset.copy ? document.getElementById(btn.dataset.copy) : btn.closest(".code")?.querySelector("pre");
    const text = btn.dataset.copyText ?? target?.textContent ?? "";
    await copyText(text);
    const label = btn.querySelector(".copy-label");
    btn.classList.add("is-copied");
    if (label) {
      const old = label.textContent;
      label.textContent = "Copied";
      setTimeout(() => (label.textContent = old), 1400);
    }
    setTimeout(() => btn.classList.remove("is-copied"), 1400);
  });

  // ---------------------------------------------------------------- confirmations
  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    if (form.dataset.confirm && !confirm(form.dataset.confirm)) ev.preventDefault();
  });

  // ---------------------------------------------------------------- toasts
  $$(".toast").forEach((t) => setTimeout(() => {
    t.classList.add("is-leaving");
    setTimeout(() => t.remove(), 220);
  }, t.classList.contains("is-error") ? 8000 : 4500));
  // Drop ?ok= / ?error= from the address bar so a reload doesn't show the toast again.
  const url = new URL(location.href);
  if (url.searchParams.has("ok") || url.searchParams.has("error")) {
    url.searchParams.delete("ok");
    url.searchParams.delete("error");
    history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
  }

  // ---------------------------------------------------------------- mobile sidebar
  const sidebar = $("#sidebar");
  const scrim = $(".scrim");
  const setSidebar = (open) => {
    if (!sidebar) return;
    sidebar.classList.toggle("is-open", open);
    if (scrim) scrim.hidden = !open;
    $$("[data-open-sidebar]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
  };
  document.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-open-sidebar]")) setSidebar(true);
    if (ev.target.closest("[data-close-sidebar]")) setSidebar(false);
  });

  // ---------------------------------------------------------------- command palette
  const palette = $("#palette");
  const pInput = $("#palette-input");
  const pResults = $("#palette-results");
  let pData = null;
  let pSel = 0;
  async function openPalette() {
    if (!palette) return;
    palette.hidden = false;
    pInput.value = "";
    pInput.focus();
    if (!pData) pData = await fetch("/palette.json", { headers: { Accept: "application/json" } }).then((r) => r.json()).catch(() => []);
    renderPalette();
  }
  const closePalette = () => {
    if (palette) palette.hidden = true;
  };
  function renderPalette() {
    const q = norm(pInput.value.trim());
    const words = q.split(/\s+/).filter(Boolean);
    // Names that start with the query first, then names that contain it, then matches in the description.
    const rank = (i) => {
      const label = norm(i.label);
      return label.startsWith(q) ? 0 : words.every((w) => label.includes(w)) ? 1 : 2;
    };
    const items = (pData || []).filter((i) => !words.length || words.every((w) => i.search.includes(w)))
      .map((i) => [rank(i), i]).sort((a, b) => a[0] - b[0]).slice(0, 40).map(([, i]) => i);
    pSel = 0;
    pResults.innerHTML = "";
    if (!items.length) {
      pResults.innerHTML = '<li class="palette-empty">No results</li>';
      return;
    }
    for (const [k, i] of items.entries()) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = i.href;
      a.setAttribute("role", "option");
      if (i.logo) {
        const img = Object.assign(document.createElement("img"), { src: i.logo, alt: "", width: 22, height: 22, loading: "lazy" });
        img.className = `logo is-xs${i.image ? " is-image" : ""}`;
        a.append(img);
      }
      a.append(document.createTextNode(i.label));
      const small = document.createElement("small");
      small.textContent = i.hint || "";
      a.append(small);
      if (k === 0) a.classList.add("is-selected");
      li.append(a);
      pResults.append(li);
    }
  }
  function movePalette(d) {
    const links = $$("a", pResults);
    if (!links.length) return;
    links[pSel]?.classList.remove("is-selected");
    pSel = (pSel + d + links.length) % links.length;
    links[pSel].classList.add("is-selected");
    links[pSel].scrollIntoView({ block: "nearest" });
  }
  if (palette) {
    pInput.addEventListener("input", renderPalette);
    pInput.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") { ev.preventDefault(); movePalette(1); }
      if (ev.key === "ArrowUp") { ev.preventDefault(); movePalette(-1); }
      if (ev.key === "Enter") { const a = $$("a", pResults)[pSel]; if (a) location.href = a.href; }
    });
    palette.addEventListener("click", (ev) => { if (ev.target === palette) closePalette(); });
  }
  document.addEventListener("click", (ev) => { if (ev.target.closest("[data-palette-open]")) openPalette(); });
  document.addEventListener("keydown", (ev) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || "");
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); palette?.hidden ? openPalette() : closePalette(); }
    if (ev.key === "/" && !typing && palette?.hidden) {
      const local = $("[data-app-search]");
      ev.preventDefault();
      if (local) local.focus();
      else openPalette();
    }
    if (ev.key === "Escape") {
      if (palette && !palette.hidden) closePalette();
      else if (drawer?.classList.contains("is-open")) closeDrawer();
      else setSidebar(false);
    }
  });

  // ---------------------------------------------------------------- apps page: tabs, categories, search, show more
  const appsRoot = $("[data-apps]");
  if (appsRoot) {
    const cards = $$(".app-card[data-search]", appsRoot).map((el) => ({ el, text: el.dataset.search }));
    const search = $("[data-app-search]");
    const sections = $$("[data-hide-when-filtering]", appsRoot);
    const allSection = $("[data-all-apps]", appsRoot);
    const moreBtn = $("[data-show-more]", appsRoot);
    const emptyState = $("[data-apps-empty]", appsRoot);
    const countEl = $("[data-apps-count]", appsRoot);
    const PAGE = Number(appsRoot.dataset.page || 60);
    let limit = PAGE;
    let tab = appsRoot.dataset.tab || "all";
    let category = appsRoot.dataset.category || "";
    const apply = () => {
      const q = norm(search?.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      const filtering = Boolean(words.length || category || tab !== "all");
      sections.forEach((s) => (s.hidden = filtering));
      let shown = 0;
      let matches = 0;
      for (const { el, text } of cards) {
        const okTab = tab === "all" || (tab === "connected" && el.dataset.connected === "1") || (tab === "shared" && el.dataset.shared === "1")
          || (tab === "oneclick" && el.dataset.oneclick === "1");
        const ok = okTab && (!category || el.dataset.category === category) && words.every((w) => text.includes(w));
        if (ok) matches++;
        const visible = ok && (filtering || shown < limit);
        el.hidden = !visible;
        if (visible) shown++;
      }
      if (moreBtn) moreBtn.hidden = filtering || shown >= matches;
      if (emptyState) emptyState.hidden = matches > 0;
      if (countEl) countEl.textContent = matches.toLocaleString("en-US");
      if (allSection) allSection.dataset.filtering = filtering ? "1" : "0";
    };
    search?.addEventListener("input", apply);
    moreBtn?.addEventListener("click", () => { limit += PAGE * 2; apply(); });
    $$("[data-tab]", appsRoot).forEach((b) => b.addEventListener("click", () => {
      tab = b.dataset.tab;
      $$("[data-tab]", appsRoot).forEach((x) => x.classList.toggle("is-active", x === b));
      apply();
    }));
    $$("[data-category]", appsRoot).forEach((b) => b.addEventListener("click", () => {
      category = b.dataset.category;
      $$("[data-category]", appsRoot).forEach((x) => x.classList.toggle("is-active", x === b));
      apply();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    const params = new URLSearchParams(location.search);
    if (params.get("q") && search) search.value = params.get("q");
    apply();
  }

  // ---------------------------------------------------------------- agents page: filter + install drawer
  const agentsRoot = $("[data-agents]");
  let drawer = null;
  let drawerScrim = null;
  let lastFocus = null;
  let newToken = null; // a token created from the drawer lives only in memory, never in storage
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawerScrim?.classList.remove("is-open");
    setTimeout(() => { drawer?.remove(); drawerScrim?.remove(); drawer = drawerScrim = null; lastFocus?.focus(); }, 260);
  }
  function fillToken(root, token) {
    $$("pre[data-template]", root).forEach((pre) => {
      pre.textContent = pre.dataset.template.split("{{TOKEN}}").join(token);
    });
  }
  function openDrawer(id) {
    const tpl = document.getElementById(`agent-${id}`);
    if (!tpl) return;
    lastFocus = document.activeElement;
    drawerScrim = Object.assign(document.createElement("div"), { className: "drawer-scrim" });
    drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.append(tpl.content.cloneNode(true));
    document.body.append(drawerScrim, drawer);
    drawer.getBoundingClientRect();
    requestAnimationFrame(() => { drawer.classList.add("is-open"); drawerScrim.classList.add("is-open"); });
    drawerScrim.addEventListener("click", closeDrawer);
    $("[data-close-drawer]", drawer)?.addEventListener("click", closeDrawer);
    if (newToken) fillToken(drawer, newToken);
    $("[data-create-token]", drawer)?.addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      const body = new URLSearchParams({ csrf: csrf(), name: btn.dataset.name, apps: "*", format: "json" });
      const r = await fetch("/tokens", { method: "POST", body, headers: { Accept: "application/json" } }).then((x) => x.json()).catch(() => null);
      btn.disabled = false;
      if (!r?.token) {
        alert(r?.error || "Couldn't create the token.");
        return;
      }
      newToken = r.token;
      fillToken(drawer, r.token);
      const box = $("[data-token-box]", drawer);
      if (box) {
        box.hidden = false;
        $("pre", box).textContent = r.token;
      }
      btn.closest("[data-token-step]")?.classList.add("is-done");
    });
    $("[data-use-token]", drawer)?.addEventListener("input", (ev) => {
      const v = ev.target.value.trim();
      fillToken(drawer, v || "{{TOKEN}}");
    });
    setTimeout(() => $(".drawer-head .icon-button", drawer)?.focus(), 50);
  }
  if (agentsRoot) {
    const cards = $$(".agent-card[data-search]", agentsRoot).map((el) => ({ el, text: el.dataset.search }));
    const search = $("[data-agent-search]", agentsRoot);
    let kind = "all";
    const apply = () => {
      const words = norm(search?.value.trim()).split(/\s+/).filter(Boolean);
      let n = 0;
      for (const { el, text } of cards) {
        const ok = (kind === "all" || el.dataset.kind === kind || (kind === "popular" && el.dataset.popular === "1")) && words.every((w) => text.includes(w));
        el.hidden = !ok;
        if (ok) n++;
      }
      const empty = $("[data-agents-empty]", agentsRoot);
      if (empty) empty.hidden = n > 0;
    };
    search?.addEventListener("input", apply);
    // Only the filter buttons: the agent cards carry data-kind too, and clicking "Add" on one must not filter the list.
    $$("button[data-kind]", agentsRoot).forEach((b) => b.addEventListener("click", () => {
      kind = b.dataset.kind;
      $$("button[data-kind]", agentsRoot).forEach((x) => x.classList.toggle("is-active", x === b));
      apply();
    }));
    apply();
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-agent-open]");
    if (b) openDrawer(b.dataset.agentOpen);
  });
  const wanted = new URLSearchParams(location.search).get("agent");
  if (wanted) openDrawer(wanted);

  // ---------------------------------------------------------------- tokens page: app scope selector
  const all = $("#token-all");
  if (all) {
    const list = $("#token-apps");
    const sync = () => (list.hidden = all.checked);
    all.addEventListener("change", sync);
    sync();
  }

  // ---------------------------------------------------------------- Microsoft device code
  const flow = $("[data-device-flow]");
  if (flow) {
    const status = $("[data-device-status]", flow);
    const poll = async () => {
      const r = await fetch(`/apps/microsoft365/device-status?scope=${encodeURIComponent(flow.dataset.scope)}`).then((x) => x.json()).catch(() => ({}));
      if (r.status === "waiting") return setTimeout(poll, 3000);
      status.textContent = r.status === "connected" ? `Connected as ${r.account}. Reloading…` : r.error ? `Couldn't connect: ${r.error}` : "The code expired.";
      setTimeout(() => location.reload(), 1400);
    };
    setTimeout(poll, 3000);
  }
})();
