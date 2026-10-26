// Product: its lots, its prices, and everyone who bought it before, with a WhatsApp button each.

import { productOf, productStats, productBuyers, lotSoldKg, lotOf, isSlow, TYPE_LABELS } from "../model.js";
import { tonsValue, groupDigits, quantity, shortDate, parseNumber, NBSP } from "../format.js";
import { esc, icon, tile, agePill, figure, segmented, bindSegmented, waLink, fromOrigin, openSheet, toast, haptic } from "../ui.js";
import { logRelance, correctLotWeight } from "../store.js";
import { people, emptyState } from "../illus.js";

let sort = "recent"; // "recent" | "volume"

/** "du gingembre", "de l’hibiscus" */
export function partitive(name) {
  const lower = name.toLowerCase();
  return /^[aeiouyhàâéèêîïôû]/.test(lower) ? `de l’${lower}` : `du ${lower}`;
}

function offerText(buyer, product, lot) {
  const first = buyer.name.split(" ")[0];
  const what = lot ? ` : lot${NBSP}${lot.no} ${fromOrigin(lot.origin)}, ${quantity(lot.remainingKg)}` : "";
  return `Bonjour ${first}, j’ai ${partitive(product.name)} disponible${what}. Ça vous intéresse ?`;
}

export function render({ state, params, now }) {
  const product = productOf(state, params[0]);
  if (!product) {
    return `<section class="screen"><div class="scroll">
      <header class="hdr pushed"><a class="back" href="#/stock">${icon("back")}Stock</a><h1 class="title">Produit introuvable</h1></header>
    </div></section>`;
  }
  const stats = productStats(state, product.id, now);
  const firstSlow = stats.lots.find((l) => isSlow(l.ageDays)) ?? stats.lots[0];
  const buyers = productBuyers(state, product.id, now).sort((a, b) =>
    sort === "volume" ? b.totalKg - a.totalKg : new Date(b.last.at) - new Date(a.last.at),
  );
  const contacted = buyers.filter((b) => b.contacted).length;
  const price = (v) => (v ? figure(groupDigits(v), "F/kg") : `<span class="fig">—</span>`);

  const header = `
    <header class="hdr pushed">
      <button type="button" class="back" data-back>${icon("back")}Stock</button>
      <div style="display:flex;align-items:center;gap:14px">
        ${tile(product, 52)}
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <h1 class="title">${esc(product.name)}</h1>
          <span class="subtitle">${tonsValue(stats.totalKg)}${NBSP}t en stock · ${stats.lots.length} ${stats.lots.length > 1 ? "lots" : "lot"}</span>
        </div>
      </div>
      <div class="stat-tiles">
        <div class="stat-tile"><span class="k">Dernier prix</span><span class="v">${price(stats.lastPrice)}</span></div>
        <div class="stat-tile"><span class="k">Moyenne 30 jours</span><span class="v">${price(stats.average30)}</span></div>
      </div>
    </header>`;

  const lots = stats.lots.length
    ? `<section class="section"><h2 class="h2">Lots</h2><ul class="group">
        ${stats.lots.map((lot) => `<li><button type="button" class="row" data-lot="${esc(lot.id)}">
          <span class="row-main">
            <span class="row-title">Lot${NBSP}${lot.no} · ${esc(lot.origin)}</span>
            <span class="row-meta">Arrivé le ${shortDate(lot.arrivedAt)}${lot.note ? " · " + esc(lot.note) : ""}</span>
          </span>
          <span class="row-side">${figure(tonsValue(lot.remainingKg), "t")}${agePill(lot.ageDays)}</span>
        </button></li>`).join("")}
      </ul></section>`
    : "";

  const buyerRows = buyers.map((row) => `<li><div class="row">
      <a class="row-main" href="#/acheteur/${esc(row.buyer.id)}" style="color:inherit;text-decoration:none">
        <span class="row-title">${esc(row.buyer.name)}</span>
        <span class="row-meta">${esc(row.buyer.place || TYPE_LABELS[row.buyer.type])} · ${row.times} ${row.times > 1 ? "achats" : "achat"} · ${shortDate(row.last.at)}</span>
        <span class="row-line">${quantity(row.last.kg)} à ${groupDigits(row.last.pricePerKg)}${NBSP}F/kg</span>
      </a>
      <a class="wa ${row.contacted ? "done" : ""}" href="${esc(waLink(row.buyer.phone, offerText(row.buyer, product, firstSlow)))}" target="_blank" rel="noopener"
         data-relance="${esc(row.buyer.id)}" aria-label="${row.contacted ? "Réécrire" : "Écrire"} à ${esc(row.buyer.name)} sur WhatsApp">
        ${row.contacted ? icon("check", 16, 'stroke-width="2.6"') + "Contacté" : icon("chat", 16) + "WhatsApp"}
      </a>
    </div></li>`).join("");

  const buyersSection = buyers.length
    ? `<section class="section">
        <div class="h2-row"><h2 class="h2">Ils en ont déjà acheté</h2><span class="h2-side">${contacted} sur ${buyers.length} contactés</span></div>
        ${firstSlow ? `<p class="lead">Proposez-leur d’abord le lot${NBSP}${firstSlow.no}.</p>` : ""}
        ${segmented("sort", [{ value: "recent", label: "Plus récents" }, { value: "volume", label: "Plus gros volumes" }], sort, "Trier")}
        <ul class="group">${buyerRows}</ul>
      </section>`
    : emptyState({ art: people, title: "Personne ne l’a encore acheté", text: "Après votre première vente de ce produit, l’acheteur apparaîtra ici avec son prix." });

  const footer = stats.totalKg > 0
    ? `<a class="btn" href="#/vente?product=${esc(product.id)}">Vendre ${esc(partitive(product.name))}</a>`
    : `<button type="button" class="btn" disabled>Plus de stock à vendre</button>`;

  return `<section class="screen">
    <div class="scroll">${header}${lots}${buyersSection}</div>
    <div class="footer">${footer}</div>
  </section>`;
}

export function bind(root, { state, params, back, refresh, now }) {
  const product = productOf(state, params[0]);
  root.querySelector("[data-back]")?.addEventListener("click", () => back("/stock"));
  if (!product) return;
  bindSegmented(root, (_, value) => {
    sort = value;
    refresh();
  });

  const lots = productStats(state, product.id, now).lots;
  root.querySelectorAll("[data-relance]").forEach((link) => {
    link.addEventListener("click", (event) => {
      // Open WhatsApp first, then remember the relance (which redraws the screen).
      event.preventDefault();
      window.open(link.href, "_blank", "noopener");
      haptic("medium");
      const firstSlow = lots.find((l) => isSlow(l.ageDays)) ?? lots[0];
      logRelance({ buyerId: link.dataset.relance, productId: product.id, lotId: firstSlow?.id });
    });
  });

  root.querySelectorAll("[data-lot]").forEach((button) => {
    button.addEventListener("click", () => openCorrection(state, button.dataset.lot));
  });
}

/** Sheet to correct a lot's received weight (after weighing again). */
function openCorrection(state, lotId) {
  const lot = lotOf(state, lotId);
  const sold = lotSoldKg(state, lotId);
  openSheet(
    `<h2 class="sheet-title">Corriger le lot ${lot.no}</h2>
     <p class="sheet-body">Poids reçu enregistré : ${quantity(lot.kgIn)}. Déjà vendu : ${quantity(sold)}.</p>
     <label class="field"><span class="form-label">Poids reçu</span>
       <span class="input-unit"><input inputmode="decimal" autofocus value="${tonsValue(lot.kgIn)}" data-kg><span class="u">t</span></span>
     </label>
     <span class="hint" data-msg></span>
     <div class="sheet-actions">
       <button type="button" class="btn" data-save>Enregistrer la correction</button>
       <button type="button" class="btn btn-plain" data-cancel>Annuler</button>
     </div>`,
    (panel, close) => {
      const input = panel.querySelector("[data-kg]");
      const msg = panel.querySelector("[data-msg]");
      panel.querySelector("[data-cancel]").addEventListener("click", close);
      panel.querySelector("[data-save]").addEventListener("click", () => {
        const kg = Math.round(parseNumber(input.value) * 1000);
        if (kg < sold) {
          msg.className = "hint err";
          msg.textContent = `Impossible : ${quantity(sold)} ont déjà été vendus sur ce lot.`;
          haptic("warning");
          return;
        }
        if (kg !== lot.kgIn) correctLotWeight(lotId, kg);
        close();
        toast(`Lot ${lot.no} corrigé`);
      });
    },
  );
}
