// Journal: everything she did, grouped by day, read like a bank statement.
// Green only marks money received.

import { journal, productOf, buyerOf, lotOf, saleTotal } from "../model.js";
import { dayKey, dayLabel, time, quantity, money, NBSP } from "../format.js";
import { esc, icon, deName, haptic } from "../ui.js";
import { notebook, emptyState } from "../illus.js";

let filter = "all"; // "all" | "sale" | "arrival" | "pay" | "relance" | "edit"

const FILTERS = [
  { value: "all", label: "Tout" },
  { value: "sale", label: "Ventes" },
  { value: "arrival", label: "Arrivages" },
  { value: "pay", label: "Paiements" },
  { value: "relance", label: "Relances" },
  { value: "edit", label: "Modifications" },
];

/** Turns one journal item into { icon, title, meta, amount, href }. */
function describe(state, item) {
  const at = time(item.at);
  if (item.kind === "arrival") {
    const product = productOf(state, item.lot.productId);
    return { ev: "", glyph: "stock", href: `#/produit/${item.lot.productId}`,
      title: `${product?.name ?? "Produit"} · lot${NBSP}${item.lot.no}`, meta: `${at} · arrivage · ${item.lot.origin}`, amount: quantity(item.lot.kgIn) };
  }
  if (item.kind === "sale") {
    const s = item.sale;
    const product = productOf(state, s.productId);
    const total = saleTotal(s);
    const paid = s.paidAtSale >= total ? "payé" : s.paidAtSale > 0 ? "avance" : "à crédit";
    return { ev: "", glyph: "sale", href: `#/acheteur/${s.buyerId}`,
      title: buyerOf(state, s.buyerId)?.name ?? "Acheteur", meta: `${at} · vente${NBSP}${s.no} · ${(product?.name ?? "").toLowerCase()} ${quantity(s.kg)} · ${paid}`, amount: money(total) };
  }
  if (item.kind === "pay") {
    const p = item.payment;
    return { ev: "pay", glyph: "cash", href: `#/acheteur/${p.buyerId}`, money: true,
      title: buyerOf(state, p.buyerId)?.name ?? "Acheteur", meta: `${at} · paiement reçu`, amount: "+" + money(p.amount) };
  }
  if (item.kind === "relance") {
    const e = item.event;
    const buyer = buyerOf(state, e.buyerId);
    const product = productOf(state, e.productId);
    const lot = lotOf(state, e.lotId);
    return { ev: "", glyph: "chat", href: buyer ? `#/acheteur/${buyer.id}` : null,
      title: `Relance ${deName(buyer?.name ?? "acheteur")}`, meta: `${at} · WhatsApp · ${(product?.name ?? "").toLowerCase()}${lot ? `, lot${NBSP}${lot.no}` : ""}` };
  }
  const e = item.event;
  return { ev: "", glyph: "pencil", href: null, title: e.text, meta: `${at}${e.detail ? " · " + e.detail : ""}` };
}

function row(state, item) {
  const d = describe(state, item);
  const inner = `
    <span class="ev ${d.ev}">${icon(d.glyph, 18)}</span>
    <span class="row-main">
      <span class="row-head"><span class="row-title sm">${esc(d.title)}</span>${d.amount ? `<span class="money ${d.money ? "in" : ""}">${d.amount}</span>` : ""}</span>
      <span class="row-meta">${esc(d.meta)}</span>
    </span>`;
  return d.href
    ? `<li><a class="row top in-38" href="${esc(d.href)}">${inner}</a></li>`
    : `<li><div class="row top in-38">${inner}</div></li>`;
}

export function render({ state, now }) {
  const items = journal(state).filter((i) => filter === "all" || i.kind === filter);
  const groups = [];
  for (const item of items) {
    const key = dayKey(item.at);
    let group = groups.at(-1);
    if (!group || group.key !== key) groups.push((group = { key, label: dayLabel(item.at, now), items: [] }));
    group.items.push(item);
  }
  const body = groups.length
    ? groups.map((g) => `<section class="section" style="gap:10px"><h2 class="day">${esc(g.label)}</h2>
        <ol class="group">${g.items.map((i) => row(state, i)).join("")}</ol></section>`).join("")
    : emptyState({
        art: notebook,
        title: filter === "all" ? "Rien pour l’instant" : "Rien de ce type pour l’instant",
        text: "Chaque arrivage, vente, paiement et relance s’inscrira ici, avec l’heure.",
      });

  return `<section class="screen">
    <header class="hdr">
      <h1 class="title">Journal</h1>
      <span class="subtitle" style="margin-top:-14px">Tout ce que vous avez fait</span>
    </header>
    <div class="filterbar"><div class="chips" role="group" aria-label="Filtrer le journal">
      ${FILTERS.map((f) => `<button type="button" class="chip" aria-pressed="${f.value === filter}" data-filter="${f.value}">${f.label}</button>`).join("")}
    </div></div>
    <div class="scroll" style="padding-top:16px;gap:24px">${body}</div>
  </section>`;
}

export function bind(root, { refresh }) {
  root.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    haptic("light");
    refresh();
  }));
}
