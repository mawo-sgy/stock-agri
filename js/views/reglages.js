// Settings: products (add, rename, colour, delete), backup and restore, vibrations, erase.

import { productHasHistory, productHasStock, codeFor } from "../model.js";
import { dayKey, longDate } from "../format.js";
import { esc, icon, haptic, toast, confirmSheet } from "../ui.js";
import { saveProduct, deleteProduct, setSetting, exportBackup, readBackup, importBackup, eraseAll, PRODUCT_COLORS } from "../store.js";

const COLOR_NAMES = { "#9A5A22": "Brun", "#A3324F": "Bordeaux", "#2E6E8E": "Bleu", "#846812": "Ocre", "#6D4396": "Violet", "#4A5560": "Ardoise" };

let editing = null; // product id being edited, or "new"
let draft = { name: "", color: PRODUCT_COLORS[0] };

function editor(state, product) {
  const locked = product && productHasHistory(state, product.id);
  return `<div class="editor">
    <label>Nom<input class="input" autocomplete="off" value="${esc(draft.name)}" placeholder="ex. Fonio" data-name></label>
    <fieldset><legend style="font-size:14px;font-weight:700;color:var(--ink-2);margin-bottom:10px">Couleur</legend>
      <div class="swatches">${PRODUCT_COLORS.map((c) => `<button type="button" class="swatch" style="--c:${c}" aria-pressed="${c === draft.color}" aria-label="${COLOR_NAMES[c] ?? "Couleur"}" data-color="${c}"></button>`).join("")}</div>
    </fieldset>
    <div class="btn-row">
      <button type="button" class="btn btn-plain" style="background:var(--fill)" data-cancel>Annuler</button>
      <button type="button" class="btn" data-save ${draft.name.trim() ? "" : "disabled"}>${product ? "Enregistrer" : "Ajouter"}</button>
    </div>
    ${product && !locked ? `<button type="button" class="btn btn-text-danger" data-delete>Supprimer ce produit</button>` : ""}
    ${locked ? `<p class="note">${productHasStock(state, product.id) ? "Ce produit a du stock" : "Ce produit a déjà des ventes"} : il ne peut pas être supprimé, mais vous pouvez le renommer.</p>` : ""}
  </div>`;
}

export function render({ state }) {
  const rows = state.products.map((p) => {
    const open = editing === p.id;
    const tileColor = open ? draft.color : p.color;
    const name = open && draft.name.trim() ? draft.name.trim() : p.name;
    return `<li class="${open ? "" : ""}">
      <button type="button" class="row in-40" data-edit="${esc(p.id)}" aria-expanded="${open}">
        <span class="tile" aria-hidden="true" style="--c:${esc(tileColor)};--s:40px;--r:11px;font-size:14px">${esc(open ? codeFor(name) : p.code)}</span>
        <span class="row-main"><span class="row-title">${esc(name)}</span>
          <span class="row-meta">${productHasStock(state, p.id) ? "En stock" : "Pas de stock en ce moment"}</span></span>
        <span class="chev">${icon(open ? "down" : "chevron", 16, 'stroke-width="2.4"')}</span>
      </button>
      ${open ? editor(state, p) : ""}
    </li>`;
  }).join("");

  return `<section class="screen">
    <header class="hdr">
      <h1 class="title">Réglages</h1>
      <span class="subtitle" style="margin-top:-14px">Produits, sauvegarde et préférences</span>
    </header>
    <div class="scroll pad-top">
      ${state.settings.sample ? `<div class="banner">
        <p><strong>Vous voyez des données d’exemple.</strong> Les noms, quantités et prix sont inventés pour essayer l’application.</p>
        <button type="button" class="btn" data-clear-sample>Effacer les exemples et commencer</button>
      </div>` : ""}

      <section class="section"><h2 class="h2">Produits · ${state.products.length}</h2>
        <ul class="group">
          ${rows}
          <li>
            <button type="button" class="row in-40" data-new style="color:var(--green)">
              <span class="tile" aria-hidden="true" style="--c:var(--tint);--s:40px;--r:11px;color:var(--green)">${icon("plus", 18, 'stroke-width="2.6"')}</span>
              <span class="row-title">Ajouter un produit</span>
            </button>
            ${editing === "new" ? editor(state, null) : ""}
          </li>
        </ul>
        <p class="note">Chaque modification est notée dans le journal.</p>
      </section>

      <section class="section"><h2 class="h2">Sauvegarde</h2>
        <div class="group">
          <button type="button" class="row" data-export>${icon("upload", 22)}<span class="row-main"><span class="row-title sm">Exporter une sauvegarde</span>
            <span class="row-meta">Un fichier à garder sur WhatsApp ou Google Drive.</span></span></button>
          <label class="row" style="cursor:pointer">${icon("download", 22)}<span class="row-main"><span class="row-title sm">Restaurer une sauvegarde</span>
            <span class="row-meta">Remplace les données de ce téléphone.</span></span>
            <input type="file" accept="application/json,.json" class="sr-only" data-import></label>
        </div>
        <p class="note">Vos données sont enregistrées sur ce téléphone. Exportez une sauvegarde de temps en temps pour ne rien perdre.</p>
      </section>

      <section class="section"><h2 class="h2">Préférences</h2>
        <div class="group">
          <label class="switch-row">
            <span class="row-main"><span class="row-title sm">Vibrations</span><span class="row-meta">Un léger retour quand vous touchez un bouton.</span></span>
            <input type="checkbox" class="switch" switch ${state.settings.vibrations !== false ? "checked" : ""} data-vibrations>
          </label>
        </div>
      </section>

      <section class="section">
        <button type="button" class="btn btn-text-danger" data-erase>${icon("trash", 20)}Tout effacer</button>
      </section>

      <details class="tech">
        <summary>Informations techniques</summary>
        <pre data-tech></pre>
      </details>
    </div>
  </section>`;
}

/** Which version runs and what the screen reports: enough to diagnose a layout problem from one screenshot. */
async function techInfo() {
  const probe = (css) => {
    const el = Object.assign(document.createElement("div"), { style: `position:fixed;visibility:hidden;${css}` });
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.remove();
    return r;
  };
  const px = (n) => Math.round(n);
  const app = document.getElementById("app").getBoundingClientRect();
  const versions = "caches" in window ? (await caches.keys()).filter((k) => k.startsWith("stock-")) : [];
  const ios = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  return [
    `Version : ${versions.join(", ") || "aucune (pas de service worker)"}`,
    `Mode : ${matchMedia("(display-mode: standalone)").matches || navigator.standalone ? "application" : "navigateur"}${ios ? ` · iOS ${ios[1]}.${ios[2]}` : ""}`,
    `Écran : ${screen.width} × ${screen.height}`,
    `Fenêtre : ${innerWidth} × ${innerHeight} · visible ${px(visualViewport?.height ?? 0)}`,
    `100vh ${px(probe("height:100vh").height)} · 100dvh ${px(probe("height:100dvh").height)} · 100lvh ${px(probe("height:100lvh").height)} · fixe ${px(probe("top:0;bottom:0").height)}`,
    `Zones sûres : haut ${px(probe("height:env(safe-area-inset-top)").height)} · bas ${px(probe("height:env(safe-area-inset-bottom)").height)}`,
    `Cadre : ${px(app.top)} → ${px(app.bottom)}`,
  ].join("\n");
}

export function bind(root, { state, refresh }) {
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    const product = state.products.find((p) => p.id === b.dataset.edit);
    editing = editing === product.id ? null : product.id;
    draft = { name: product.name, color: product.color };
    haptic("light");
    refresh();
  }));
  root.querySelector("[data-new]").addEventListener("click", () => {
    editing = editing === "new" ? null : "new";
    draft = { name: "", color: PRODUCT_COLORS[state.products.length % PRODUCT_COLORS.length] };
    haptic("light");
    refresh();
  });

  const name = root.querySelector("[data-name]");
  if (name) {
    name.addEventListener("input", () => {
      draft.name = name.value;
      root.querySelector(".editor [data-save]").disabled = !name.value.trim();
    });
    if (editing === "new") name.focus();
  }
  root.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => {
    draft.color = b.dataset.color;
    haptic("light");
    refresh();
  }));
  root.querySelector(".editor [data-cancel]")?.addEventListener("click", () => {
    editing = null;
    refresh();
  });
  root.querySelector(".editor [data-save]")?.addEventListener("click", () => {
    const id = editing === "new" ? null : editing;
    editing = null;
    saveProduct({ id, name: draft.name, color: draft.color });
    haptic("success");
    toast(`Produit « ${draft.name.trim()} » enregistré`);
  });
  root.querySelector("[data-delete]")?.addEventListener("click", async () => {
    const product = state.products.find((p) => p.id === editing);
    const ok = await confirmSheet({ title: `Supprimer ${product.name} ?`, body: "Il disparaîtra de la liste des produits.", confirm: "Supprimer", danger: true });
    if (!ok) return;
    editing = null;
    deleteProduct(product.id);
    toast(`Produit « ${product.name} » supprimé`);
  });

  root.querySelector("[data-export]").addEventListener("click", () => exportFile());
  root.querySelector("[data-import]").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    const text = await file.text();
    let backup;
    try {
      backup = readBackup(text);
    } catch (error) {
      haptic("warning");
      toast(error.message);
      return;
    }
    const { lots, sales, buyers } = backup.state;
    const when = backup.exportedAt ? ` du ${longDate(backup.exportedAt).toLowerCase()}` : "";
    const ok = await confirmSheet({
      title: "Restaurer cette sauvegarde ?",
      body: `Sauvegarde${when} : ${lots.length} lots, ${sales.length} ventes, ${buyers.length} acheteurs. Les données de ce téléphone seront remplacées.`,
      confirm: "Restaurer",
      danger: true,
    });
    if (!ok) return;
    importBackup(text);
    toast("Sauvegarde restaurée");
  });
  root.querySelector("[data-vibrations]").addEventListener("change", (event) => {
    setSetting("vibrations", event.target.checked);
    haptic("medium");
  });
  root.querySelector("[data-clear-sample]")?.addEventListener("click", async () => {
    const ok = await confirmSheet({ title: "Effacer les exemples ?", body: "L’application repart vide, avec vos cinq produits habituels.", confirm: "Effacer et commencer", danger: true });
    if (ok) {
      eraseAll();
      toast("Prêt pour vos données");
    }
  });
  root.querySelector(".tech").addEventListener("toggle", async (event) => {
    if (event.target.open) root.querySelector("[data-tech]").textContent = await techInfo();
  });
  root.querySelector("[data-erase]").addEventListener("click", async () => {
    const ok = await confirmSheet({ title: "Tout effacer ?", body: "Lots, ventes, acheteurs et journal seront supprimés de ce téléphone. Exportez une sauvegarde avant si vous voulez les garder.", confirm: "Tout effacer", danger: true });
    if (ok) {
      eraseAll();
      toast("Données effacées");
    }
  });
}

/** Shares the backup file (WhatsApp, Drive…) when the phone allows it, otherwise downloads it. */
async function exportFile() {
  const name = `stock-sauvegarde-${dayKey(new Date())}.json`;
  const file = new File([exportBackup()], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sauvegarde du stock" });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Sauvegarde téléchargée");
}
