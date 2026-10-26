// Stock: total in stock, the slow lots first (with how many past buyers to follow up), then the rest.

import { stockSummary, productOf, buyersToFollowUp } from "../model.js";
import { tonsValue, NBSP } from "../format.js";
import { esc, icon, tile, agePill, figure, countUp, haptic } from "../ui.js";
import { sacks, emptyState } from "../illus.js";

let filter = "all"; // "all" | "slow"
let counted = false; // the total counts up once per session

function lotRow(state, lot, now, slow) {
  const product = productOf(state, lot.productId);
  const toCall = slow ? buyersToFollowUp(state, lot.productId, now) : 0;
  const follow = slow
    ? toCall > 0
      ? `<span class="follow">${icon("chat", 14)}<span>${toCall} à relancer</span></span>`
      : `<span class="follow">${icon("check", 14)}<span>Acheteurs relancés</span></span>`
    : "";
  return `<li><a class="row in-44" href="#/produit/${esc(lot.productId)}">
    ${tile(product, 44)}
    <span class="row-main">
      <span class="row-title">${esc(product?.name ?? "Produit supprimé")}</span>
      <span class="row-meta">Lot${NBSP}${lot.no} · ${esc(lot.origin)}</span>
      ${follow}
    </span>
    <span class="row-side">${figure(tonsValue(lot.remainingKg), "t")}${agePill(lot.ageDays)}</span>
  </a></li>`;
}

export function render({ state, now }) {
  const s = stockSummary(state, now);
  const header = `
    <header class="hdr">
      <div class="hdr-row">
        <h1 class="title">Stock</h1>
        <a class="hdr-pill" href="#/arrivage">${icon("plus", 18, 'stroke-width="2.6"')}Arrivage</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="hero"><span data-total>${tonsValue(s.totalKg)}</span><span class="unit">${NBSP}t</span></span>
        <span class="subtitle">en stock · ${s.lotCount} ${s.lotCount > 1 ? "lots" : "lot"}</span>
      </div>
      ${s.slowCount > 0 ? `
      <button type="button" class="alert" data-toggle-slow aria-pressed="${filter === "slow"}">
        ${icon("clock", 20)}
        <span class="grow">${s.slowCount} ${s.slowCount > 1 ? "lots" : "lot"} à écouler</span>
        <span class="act">${filter === "slow" ? "Tout voir" : "Voir"}</span>${icon(filter === "slow" ? "close" : "chevron", 16)}
      </button>` : ""}
    </header>`;

  if (s.lotCount === 0) {
    return `<section class="screen"><div class="scroll">${header}
      ${emptyState({
        art: sacks,
        title: "Aucun lot en stock",
        text: "Quand un camion arrive, notez-le ici. Le stock et l’âge de chaque lot se calculent tout seuls.",
        action: `<a class="btn" href="#/arrivage">${icon("plus", 20, 'stroke-width="2.4"')}Enregistrer un arrivage</a>`,
      })}
    </div></section>`;
  }

  const slow = s.slow.length
    ? `<section class="section">
        <h2 class="h2">À écouler d’abord</h2>
        <ul class="group">${s.slow.map((l) => lotRow(state, l, now, true)).join("")}</ul>
      </section>`
    : "";
  const others = filter === "all" && s.others.length
    ? `<section class="section">
        <h2 class="h2">${s.slow.length ? "Autres lots" : "Lots en stock"}</h2>
        <ul class="group">${s.others.map((l) => lotRow(state, l, now, false)).join("")}</ul>
      </section>`
    : "";

  return `<section class="screen"><div class="scroll">${header}${slow}${others}</div></section>`;
}

export function bind(root, { state, now, refresh, entered }) {
  root.querySelector("[data-toggle-slow]")?.addEventListener("click", () => {
    filter = filter === "all" ? "slow" : "all";
    haptic("light");
    refresh();
  });
  const total = root.querySelector("[data-total]");
  if (total && entered && !counted) {
    counted = true;
    const kg = stockSummary(state, now).totalKg;
    countUp(total, kg, (v) => tonsValue(v));
  }
}
