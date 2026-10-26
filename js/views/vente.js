// New sale: product and lot, buyer, quantity, price, payment. Ends on an animated confirmation
// with a ready-to-send WhatsApp receipt.

import { productOf, buyerOf, activeLots, productStats, isSlow, ageStatus, saleTotal, lotOf } from "../model.js";
import { parseNumber, decimal, tonsValue, groupDigits, money, quantity, shortDate, NBSP } from "../format.js";
import { esc, icon, figure, segmented, bindSegmented, waLink, haptic } from "../ui.js";
import { addSale } from "../store.js";
import { sacks, emptyState } from "../illus.js";

let draft = null;
let saved = null;

const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function freshDraft(state, query, now) {
  const lots = activeLots(state, now);
  const wanted = query.get("product");
  const productId = lots.some((l) => l.productId === wanted) ? wanted : (lots.find((l) => isSlow(l.ageDays)) ?? lots[0])?.productId ?? null;
  const lot = lots.find((l) => l.id === query.get("lot")) ?? lots.find((l) => l.productId === productId);
  const buyer = buyerOf(state, query.get("buyer"));
  const last = productId ? productStats(state, productId, now).lastPrice : null;
  return {
    productId,
    lotId: lot?.id ?? null,
    buyerId: buyer?.id ?? null,
    buyerText: buyer?.name ?? "",
    unit: "t",
    qty: "",
    price: last ? String(last) : "",
    pay: "paye",
    paid: "",
  };
}

/** Everything the form computes from the draft. */
function compute(state, now) {
  const d = draft;
  const lot = activeLots(state, now).find((l) => l.id === d.lotId);
  const kg = Math.round(d.unit === "t" ? parseNumber(d.qty) * 1000 : parseNumber(d.qty));
  const price = parseNumber(d.price);
  const total = Math.round(kg * price);
  const paid = d.pay === "paye" ? total : d.pay === "avance" ? Math.round(parseNumber(d.paid)) : 0;
  const due = Math.max(0, total - paid);
  const last = d.productId ? productStats(state, d.productId, now).lastPrice : null;
  const known = state.buyers.find((b) => b.id === d.buyerId) ?? state.buyers.find((b) => norm(b.name) === norm(d.buyerText));
  let problem = "";
  if (!lot) problem = "Choisissez un lot";
  else if (!d.buyerText.trim()) problem = "Choisissez un acheteur";
  else if (kg <= 0) problem = "Indiquez la quantité";
  else if (kg > lot.remainingKg) problem = "Quantité supérieure au lot";
  else if (price <= 0) problem = "Indiquez le prix";
  else if (d.pay === "avance" && paid > total) problem = "L’avance dépasse le total";
  return { lot, kg, price, total, paid, due, last, known, problem };
}

function suggestions(state, now) {
  const text = norm(draft.buyerText);
  const recent = [...state.buyers]
    .map((b) => ({ b, last: state.sales.filter((s) => s.buyerId === b.id).reduce((m, s) => Math.max(m, new Date(s.at)), 0) }))
    .sort((x, y) => y.last - x.last)
    .map((x) => x.b);
  const list = text ? recent.filter((b) => norm(b.name).includes(text) && norm(b.name) !== text) : recent;
  return list.filter((b) => b.id !== draft.buyerId).slice(0, 3);
}

function suggestionChips(state, now) {
  return suggestions(state, now)
    .map((b) => `<button type="button" class="chip outline" data-pick-buyer="${esc(b.id)}">${esc(b.name)}</button>`)
    .join("");
}

export function render({ state, query, entered, now }) {
  if (entered || !draft) {
    draft = freshDraft(state, query, now);
    saved = null;
  }
  if (saved) return renderDone(state);

  const lots = activeLots(state, now);
  if (!lots.length) {
    return `<section class="screen">
      <header class="hdr pushed" style="gap:12px"><button type="button" class="cancel" data-cancel>${icon("close", 18, 'stroke-width="2.4"')}Annuler</button><h1 class="title">Nouvelle vente</h1></header>
      <div class="scroll pad-top">${emptyState({ art: sacks, title: "Rien à vendre pour l’instant", text: "Enregistrez d’abord un arrivage : la vente se fait toujours depuis un lot.", action: `<a class="btn" href="#/arrivage">Enregistrer un arrivage</a>` })}</div>
    </section>`;
  }

  const d = draft;
  const c = compute(state, now);
  const productIds = [...new Set(lots.map((l) => l.productId))];
  const productLots = lots.filter((l) => l.productId === d.productId);

  return `<section class="screen">
    <header class="hdr pushed" style="gap:12px">
      <button type="button" class="cancel" data-cancel>${icon("close", 18, 'stroke-width="2.4"')}Annuler</button>
      <h1 class="title">Nouvelle vente</h1>
    </header>
    <div class="scroll pad-top" style="gap:24px">
      <fieldset><legend class="form-label">Produit et lot</legend>
        <div class="chips wrap">
          ${productIds.map((id) => {
            const p = productOf(state, id);
            return `<button type="button" class="chip prod" aria-pressed="${id === d.productId}" data-product="${esc(id)}">
              <span class="dot" style="--c:${esc(p.color)}">${esc(p.code)}</span>${esc(p.name)}</button>`;
          }).join("")}
        </div>
        <ul class="group">
          ${productLots.map((l) => `<li><button type="button" class="choice row" aria-pressed="${l.id === d.lotId}" data-lot="${esc(l.id)}">
            <span class="mark">${l.id === d.lotId ? icon("check", 20, 'stroke-width="2.8"') : ""}</span>
            <span class="grow">Lot${NBSP}${l.no} · ${esc(l.origin)}</span>
            ${isSlow(l.ageDays) ? `<span class="pill ${ageStatus(l.ageDays)}">${l.ageDays}${NBSP}j</span>` : ""}
            <span class="soft">${tonsValue(l.remainingKg)}${NBSP}t</span>
          </button></li>`).join("")}
        </ul>
      </fieldset>

      <div class="field">
        <label class="form-label" for="v-buyer">Acheteur</label>
        <input id="v-buyer" class="input" autocomplete="off" placeholder="Nom de l’acheteur" value="${esc(d.buyerText)}" data-buyer>
        <span class="hint ok" data-new-buyer></span>
        <div class="chips wrap" data-suggestions>${suggestionChips(state, now)}</div>
      </div>

      <div class="field">
        <div class="h2-row" style="align-items:center">
          <label class="form-label" for="v-qty">Quantité</label>
          <div class="seg small" role="group" aria-label="Unité" style="--n:2;--i:${d.unit === "t" ? 0 : 1};width:136px">
            <span class="seg-thumb" aria-hidden="true"></span>
            <button type="button" data-seg="unit" data-value="t" aria-pressed="${d.unit === "t"}">tonnes</button>
            <button type="button" data-seg="unit" data-value="kg" aria-pressed="${d.unit === "kg"}">kg</button>
          </div>
        </div>
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="${d.unit === "t" ? "Retirer 500 kg" : "Retirer 50 kg"}">${icon("minus", 22, 'stroke-width="2.4"')}</button>
          <span class="value"><input id="v-qty" inputmode="decimal" placeholder="0" value="${esc(d.qty)}" data-field="qty"><span class="u">${d.unit}</span></span>
          <button type="button" class="plus" data-step="1" aria-label="${d.unit === "t" ? "Ajouter 500 kg" : "Ajouter 50 kg"}">${icon("plus", 22, 'stroke-width="2.4"')}</button>
        </div>
        <span class="hint" data-remain></span>
      </div>

      <div class="field">
        <label class="form-label" for="v-price">Prix par kg</label>
        <span class="input-unit"><input id="v-price" inputmode="numeric" placeholder="0" value="${esc(d.price)}" data-field="price"><span class="u">F CFA</span></span>
        <span class="hint" data-price-hint></span>
      </div>

      <fieldset><legend class="form-label">Paiement</legend>
        ${segmented("pay", [{ value: "paye", label: "Payé" }, { value: "avance", label: "Avance" }, { value: "credit", label: "À crédit" }], d.pay, "Paiement")}
        ${d.pay === "avance" ? `<span class="input-unit"><input inputmode="numeric" placeholder="Montant reçu" value="${esc(d.paid)}" data-field="paid" aria-label="Montant reçu"><span class="u">F reçus</span></span>` : ""}
        <span class="due" data-due ${d.pay === "paye" ? "hidden" : ""}></span>
      </fieldset>
    </div>
    <div class="footer">
      <div class="total-row"><span class="k" data-kg>Total</span><span data-total>${figure(groupDigits(c.total), "F CFA")}</span></div>
      <button type="button" class="btn" data-save>Enregistrer la vente</button>
    </div>
  </section>`;
}

function receiptText(state, sale) {
  const product = productOf(state, sale.productId);
  const lot = lotOf(state, sale.lotId);
  const total = saleTotal(sale);
  const due = Math.max(0, total - sale.paidAtSale);
  return [
    `Reçu — vente ${sale.no}`,
    shortDate(sale.at),
    `${product?.name ?? ""}, lot ${lot?.no ?? ""} : ${quantity(sale.kg)} × ${groupDigits(sale.pricePerKg)} F/kg`,
    `Total : ${money(total)}`,
    due > 0 ? `Payé : ${money(sale.paidAtSale)} · Reste à payer : ${money(due)}` : "Payé en totalité",
    "Merci !",
  ].join("\n");
}

function renderDone(state) {
  const sale = saved;
  const product = productOf(state, sale.productId);
  const lot = lotOf(state, sale.lotId);
  const buyer = buyerOf(state, sale.buyerId);
  const total = saleTotal(sale);
  const due = Math.max(0, total - sale.paidAtSale);
  const left = Math.max(0, lot.kgIn - state.sales.filter((s) => s.lotId === lot.id).reduce((t, s) => t + s.kg, 0));
  return `<section class="screen">
    <header class="hdr pushed" style="gap:12px">
      <a class="cancel" href="#/stock">${icon("close", 18, 'stroke-width="2.4"')}Terminé</a>
      <h1 class="title">C’est noté</h1>
    </header>
    <div class="scroll" style="padding:0">
      <div class="done">
        <div class="done-head">
          <span class="done-ring">${icon("check", 34, 'stroke="#fff" stroke-width="2.6"')}</span>
          <span class="done-title">Vente ${sale.no} enregistrée</span>
          <span class="done-sub">Il reste ${quantity(left)} dans le lot${NBSP}${lot.no}.</span>
        </div>
        <dl class="group" style="margin:0">
          <div class="row kv"><dt class="k">Acheteur</dt><dd class="v" style="margin:0">${esc(buyer?.name ?? "")}</dd></div>
          <div class="row kv"><dt class="k">Produit</dt><dd class="v" style="margin:0">${esc(product?.name ?? "")} · lot${NBSP}${lot.no}</dd></div>
          <div class="row kv"><dt class="k">Quantité</dt><dd class="v" style="margin:0">${quantity(sale.kg)} à ${groupDigits(sale.pricePerKg)}${NBSP}F/kg</dd></div>
          <div class="row kv"><dt class="k">Total</dt><dd class="v" style="margin:0;font-size:19px">${money(total)}</dd></div>
          <div class="row kv"><dt class="k">Paiement</dt><dd class="v" style="margin:0">${due <= 0 ? "payé" : sale.paidAtSale > 0 ? `avance · reste ${money(due)}` : `à crédit · ${money(due)}`}</dd></div>
        </dl>
        <div class="later" style="display:flex;flex-direction:column;gap:10px">
          <a class="btn" href="${esc(waLink(buyer?.phone, receiptText(state, sale)))}" target="_blank" rel="noopener">${icon("chat", 20)}Envoyer le reçu sur WhatsApp</a>
          <div class="btn-row">
            <button type="button" class="btn btn-tonal" data-again>Autre vente</button>
            <a class="btn btn-white" href="#/acheteur/${esc(sale.buyerId)}">Voir l’acheteur</a>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/** Updates totals, hints and the save button as she types, without redrawing the inputs. */
function updateLive(root, state, now) {
  const d = draft;
  const c = compute(state, now);
  root.querySelector("[data-total]").innerHTML = figure(groupDigits(c.total), "F CFA");
  root.querySelector("[data-kg]").textContent = c.kg > 0 ? `Total · ${quantity(c.kg)}` : "Total";

  const remain = root.querySelector("[data-remain]");
  if (c.lot && c.kg > c.lot.remainingKg) {
    remain.className = "hint err";
    remain.textContent = `Le lot${NBSP}${c.lot.no} ne contient que ${quantity(c.lot.remainingKg)}.`;
  } else if (c.lot) {
    remain.className = "hint";
    remain.textContent = `Il restera ${quantity(c.lot.remainingKg - Math.max(0, c.kg))} dans le lot${NBSP}${c.lot.no}.`;
  }

  const priceHint = root.querySelector("[data-price-hint]");
  if (c.last) {
    const diff = c.price - c.last;
    const sign = diff > 0 ? "+" : "−";
    priceHint.textContent = `Dernière vente : ${groupDigits(c.last)} F/kg` + (diff && c.price ? ` (${sign}${groupDigits(Math.abs(diff))} F)` : "");
  } else priceHint.textContent = "Premier prix enregistré pour ce produit.";

  const due = root.querySelector("[data-due]");
  due.hidden = d.pay === "paye";
  due.textContent = `Reste à payer : ${money(c.due)}`;

  root.querySelector("[data-new-buyer]").textContent = d.buyerText.trim() && !c.known ? "Nouveau nom : il sera ajouté à vos acheteurs." : "";

  const save = root.querySelector("[data-save]");
  save.disabled = Boolean(c.problem);
  save.textContent = c.problem || "Enregistrer la vente";
}

function bindSuggestions(root, state, now) {
  root.querySelectorAll("[data-pick-buyer]").forEach((b) => b.addEventListener("click", () => {
    const buyer = buyerOf(state, b.dataset.pickBuyer);
    draft.buyerId = buyer.id;
    draft.buyerText = buyer.name;
    root.querySelector("[data-buyer]").value = buyer.name;
    haptic("light");
    root.querySelector("[data-suggestions]").innerHTML = suggestionChips(state, now);
    bindSuggestions(root, state, now);
    updateLive(root, state, now);
  }));
}

export function bind(root, { state, now, back, refresh, query }) {
  root.querySelector("[data-cancel]")?.addEventListener("click", () => back("/stock"));
  if (saved) {
    haptic("success");
    root.querySelector("[data-again]")?.addEventListener("click", () => {
      draft = freshDraft(state, new URLSearchParams(), now);
      saved = null;
      refresh();
    });
    return;
  }
  if (!root.querySelector("[data-save]")) return;

  root.querySelectorAll("[data-product]").forEach((b) => b.addEventListener("click", () => {
    draft.productId = b.dataset.product;
    draft.lotId = activeLots(state, now).find((l) => l.productId === draft.productId)?.id ?? null;
    const last = productStats(state, draft.productId, now).lastPrice;
    draft.price = last ? String(last) : "";
    haptic("light");
    refresh();
  }));
  root.querySelectorAll("[data-lot]").forEach((b) => b.addEventListener("click", () => {
    draft.lotId = b.dataset.lot;
    haptic("light");
    refresh();
  }));

  const buyerInput = root.querySelector("[data-buyer]");
  buyerInput.addEventListener("input", () => {
    draft.buyerText = buyerInput.value;
    const exact = state.buyers.find((b) => norm(b.name) === norm(buyerInput.value));
    draft.buyerId = exact?.id ?? null;
    root.querySelector("[data-suggestions]").innerHTML = suggestionChips(state, now);
    bindSuggestions(root, state, now);
    updateLive(root, state, now);
  });
  bindSuggestions(root, state, now);

  root.querySelectorAll("[data-field]").forEach((input) => input.addEventListener("input", () => {
    draft[input.dataset.field] = input.value;
    updateLive(root, state, now);
  }));
  root.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const step = draft.unit === "t" ? 0.5 : 50;
    const next = Math.max(0, parseNumber(draft.qty) + Number(b.dataset.step) * step);
    draft.qty = decimal(next, 2).replace(/[\s ]/g, "");
    root.querySelector('[data-field="qty"]').value = draft.qty;
    haptic("light");
    updateLive(root, state, now);
  }));

  bindSegmented(root, (name, value) => {
    if (name === "unit" && value !== draft.unit) {
      const n = parseNumber(draft.qty);
      draft.qty = n ? decimal(value === "kg" ? n * 1000 : n / 1000, 3).replace(/[\s ]/g, "") : "";
      draft.unit = value;
    }
    if (name === "pay") draft.pay = value;
    refresh();
  });

  root.querySelector("[data-save]").addEventListener("click", () => {
    const c = compute(state, now);
    if (c.problem) return;
    saved = addSale({
      productId: draft.productId,
      lotId: draft.lotId,
      buyerId: c.known?.id ?? null,
      newBuyerName: draft.buyerText,
      kg: c.kg,
      pricePerKg: c.price,
      paidAtSale: c.paid,
    });
    refresh();
  });

  updateLive(root, state, now);
}
