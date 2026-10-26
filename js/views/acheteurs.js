// Buyers: search, filter by type or by who owes money, add a buyer.

import { buyersByRecency, productOf, TYPE_LABELS } from "../model.js";
import { quantity, ago, money, NBSP } from "../format.js";
import { esc, icon, avatar, waLink, haptic, openSheet, segmented, bindSegmented, toast } from "../ui.js";
import { addBuyer } from "../store.js";
import { people, search as searchArt, emptyState } from "../illus.js";

let filter = "all"; // "all" | "owes" | "gros" | "marche" | "part"
let query = "";

const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function rows(state, now) {
  const q = norm(query.trim());
  return buyersByRecency(state).filter(({ buyer, account }) => {
    if (filter === "owes" && account.owed <= 0) return false;
    if (["gros", "marche", "part"].includes(filter) && buyer.type !== filter) return false;
    return !q || norm(`${buyer.name} ${buyer.place}`).includes(q);
  });
}

function list(state, now) {
  const items = rows(state, now);
  if (!state.buyers.length) {
    return emptyState({
      art: people,
      title: "Pas encore d’acheteurs",
      text: "Ajoutez vos grossistes, vendeuses et clients. Ils s’ajoutent aussi tout seuls à votre première vente.",
      action: `<button type="button" class="btn" data-add>${icon("plus", 20, 'stroke-width="2.4"')}Ajouter un acheteur</button>`,
    });
  }
  if (!items.length) {
    return emptyState({ art: searchArt, title: "Aucun résultat", text: "Vérifiez l’orthographe, ou ajoutez ce contact." });
  }
  return `<ul class="group">${items.map(({ buyer, account }) => {
    const last = account.lastSale;
    const lastText = last ? `${esc(productOf(state, last.productId)?.name ?? "")} ${quantity(last.kg)} · ${ago(last.at, now)}` : "Aucun achat pour l’instant";
    return `<li><div class="row in-46">
      <a href="#/acheteur/${esc(buyer.id)}" style="flex:1;min-width:0;display:flex;align-items:center;gap:14px;color:inherit;text-decoration:none">
        ${avatar(buyer, 46)}
        <span class="row-main">
          <span class="row-title">${esc(buyer.name)}</span>
          <span class="row-meta">${TYPE_LABELS[buyer.type]}${buyer.place ? " · " + esc(buyer.place) : ""}</span>
          <span class="row-line" style="color:var(--ink-3)">${lastText}</span>
          ${account.owed > 0 ? `<span class="pill neutral" style="align-self:flex-start;margin-top:4px">Doit ${money(account.owed)}</span>` : ""}
        </span>
      </a>
      <a class="round-btn" href="${esc(waLink(buyer.phone))}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(buyer.name)}">${icon("chat", 20)}</a>
    </div></li>`;
  }).join("")}</ul>`;
}

export function render({ state, now }) {
  const owing = buyersByRecency(state).filter((r) => r.account.owed > 0).length;
  const chips = [
    { value: "all", label: "Tous" },
    { value: "owes", label: `Doivent · ${owing}` },
    { value: "gros", label: "Grossistes" },
    { value: "marche", label: "Marchés" },
    { value: "part", label: "Particuliers" },
  ];
  return `<section class="screen">
    <header class="hdr">
      <div class="hdr-row">
        <div style="display:flex;flex-direction:column;gap:2px">
          <h1 class="title">Acheteurs</h1>
          <span class="subtitle">${state.buyers.length} ${state.buyers.length > 1 ? "contacts" : "contact"}</span>
        </div>
        <button type="button" class="hdr-pill" data-add>${icon("plus", 18, 'stroke-width="2.6"')}Ajouter</button>
      </div>
      <label class="search">${icon("search", 18)}<span class="sr-only">Rechercher un acheteur</span>
        <input type="search" placeholder="Nom, marché ou ville" value="${esc(query)}" data-search autocomplete="off">
      </label>
    </header>
    <div class="filterbar"><div class="chips" role="group" aria-label="Filtrer">
      ${chips.map((c) => `<button type="button" class="chip" aria-pressed="${c.value === filter}" data-filter="${c.value}">${esc(c.label)}</button>`).join("")}
    </div></div>
    <div class="scroll" style="padding-top:16px" data-list>${list(state, now)}</div>
  </section>`;
}

export function bind(root, ctx) {
  const { state, now, refresh } = ctx;
  root.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    haptic("light");
    refresh();
  }));
  const input = root.querySelector("[data-search]");
  input.addEventListener("input", () => {
    query = input.value;
    root.querySelector("[data-list]").innerHTML = list(state, now);
    bindAdd(root, ctx);
  });
  bindAdd(root, ctx);
}

function bindAdd(root, ctx) {
  root.querySelectorAll("[data-add]").forEach((b) => {
    b.onclick = () => openBuyerSheet({}, (buyer) => {
      toast("Ajouté à vos acheteurs");
      ctx.go(`/acheteur/${buyer.id}`);
    });
  });
}

/**
 * Sheet to add or edit a buyer. `onDone(values)` receives the saved buyer
 * (for a new buyer, `addBuyer` is called here; for an edit, the caller saves).
 */
export function openBuyerSheet(existing, onDone) {
  let type = existing.type ?? "gros";
  const editing = Boolean(existing.id);
  openSheet(
    `<h2 class="sheet-title">${editing ? "Modifier l’acheteur" : "Nouvel acheteur"}</h2>
     <label class="field"><span class="form-label" style="font-size:16px">Nom</span>
       <input class="input" autofocus autocomplete="off" value="${esc(existing.name ?? "")}" data-name placeholder="Prénom et nom"></label>
     <div class="field"><span class="form-label" style="font-size:16px">Type</span>
       ${segmented("type", [{ value: "gros", label: "Grossiste" }, { value: "marche", label: "Marché" }, { value: "part", label: "Particulier" }], type, "Type d’acheteur")}</div>
     <label class="field"><span class="form-label" style="font-size:16px">Marché ou ville</span>
       <input class="input" autocomplete="off" value="${esc(existing.place ?? "")}" data-place placeholder="ex. Thiaroye, Touba"></label>
     <label class="field"><span class="form-label" style="font-size:16px">Téléphone WhatsApp</span>
       <input class="input" type="tel" inputmode="tel" value="${esc(existing.phone ?? "")}" data-phone placeholder="77${NBSP}123${NBSP}45${NBSP}67"></label>
     <div class="sheet-actions">
       <button type="button" class="btn" data-save>${editing ? "Enregistrer" : "Ajouter"}</button>
       <button type="button" class="btn btn-plain" data-cancel>Annuler</button>
     </div>`,
    (panel, close) => {
      bindSegmented(panel, (_, value) => {
        type = value;
      });
      const name = panel.querySelector("[data-name]");
      const save = panel.querySelector("[data-save]");
      const sync = () => {
        save.disabled = !name.value.trim();
      };
      name.addEventListener("input", sync);
      sync();
      panel.querySelector("[data-cancel]").addEventListener("click", close);
      save.addEventListener("click", () => {
        const values = { name: name.value, type, place: panel.querySelector("[data-place]").value, phone: panel.querySelector("[data-phone]").value };
        close();
        haptic("success");
        onDone(editing ? values : addBuyer(values));
      });
    },
  );
}
