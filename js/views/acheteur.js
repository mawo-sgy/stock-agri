// One buyer: contact actions, account (what they owe), what they buy, full history.

import { buyerOf, buyerAccount, buyerProducts, buyerHistory, productOf, lotOf, saleTotal, TYPE_LABELS } from "../model.js";
import { quantity, money, groupDigits, shortDate, parseNumber, NBSP } from "../format.js";
import { esc, icon, avatar, tile, figure, segmented, bindSegmented, waLink, waNumber, openSheet, toast, haptic } from "../ui.js";
import { addPayment, updateBuyer } from "../store.js";
import { openBuyerSheet } from "./acheteurs.js";

let filter = "all"; // "all" | "sale" | "pay"

const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export function render({ state, params }) {
  const buyer = buyerOf(state, params[0]);
  if (!buyer) {
    return `<section class="screen"><div class="scroll">
      <header class="hdr pushed"><a class="back" href="#/acheteurs">${icon("back")}Acheteurs</a><h1 class="title">Acheteur introuvable</h1></header>
    </div></section>`;
  }
  const account = buyerAccount(state, buyer.id);
  const products = buyerProducts(state, buyer.id);
  const history = buyerHistory(state, buyer.id).filter((h) => filter === "all" || h.kind === filter);
  const since = buyer.createdAt ? ` · depuis ${monthYear.format(new Date(buyer.createdAt)).split(" ")[0]}` : "";

  const header = `
    <header class="hdr pushed" style="gap:18px">
      <div class="hdr-row">
        <button type="button" class="back" data-back>${icon("back")}Acheteurs</button>
        <button type="button" class="back" data-edit style="margin-right:-8px">Modifier</button>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        ${avatar(buyer, 64)}
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <h1 class="title">${esc(buyer.name)}</h1>
          <span class="subtitle">${TYPE_LABELS[buyer.type]}${buyer.place ? " · " + esc(buyer.place) : ""}${since}</span>
        </div>
      </div>
      <div class="actions3">
        <a class="action" href="${esc(waLink(buyer.phone))}" target="_blank" rel="noopener">${icon("chat", 22)}WhatsApp</a>
        ${buyer.phone
          ? `<a class="action" href="tel:+${esc(waNumber(buyer.phone))}">${icon("phone", 20)}Appeler</a>`
          : `<button type="button" class="action" data-edit>${icon("plus", 20)}Ajouter le n°</button>`}
        <a class="action primary" href="#/vente?buyer=${esc(buyer.id)}">${icon("plus", 22, 'stroke-width="2.4"')}Lui vendre</a>
      </div>
    </header>`;

  const accountGroup = `
    <section class="group" aria-label="Compte">
      <div class="row kv"><span class="k">Acheté au total</span><span class="v">${account.count ? `${quantity(account.totalKg)} · ${account.count} ${account.count > 1 ? "achats" : "achat"}` : "Aucun achat"}</span></div>
      <div class="row kv"><span class="k">Montant total</span><span class="v">${money(account.amount)}${NBSP}CFA</span></div>
      <div class="row kv owed">
        <span style="display:flex;flex-direction:column;gap:2px">
          <span class="k" style="font-size:15px;font-weight:600">Reste à payer</span>
          <span class="v">${account.owed > 0 ? figure(groupDigits(account.owed), "F CFA") : "Rien"}</span>
        </span>
        ${account.owed > 0 ? `<button type="button" class="btn btn-sm" data-pay>Encaisser</button>` : `<span class="pill frais">À jour</span>`}
      </div>
    </section>`;

  const buys = products.length ? `
    <section class="section"><h2 class="h2">Produits achetés</h2><ul class="group">
      ${products.map((p) => `<li><a class="row in-38" href="#/produit/${esc(p.productId)}" style="padding:14px 16px">
        ${tile(p.product, 38)}
        <span class="row-main"><span class="row-title sm">${esc(p.product.name)}</span>
          <span class="row-meta">${quantity(p.kg)} en ${p.count} ${p.count > 1 ? "achats" : "achat"}</span></span>
        <span class="money" style="font-size:15px">${p.firstPrice !== p.lastPrice ? `<span style="color:var(--ink-2);font-weight:500">${groupDigits(p.firstPrice)} → </span>` : ""}${groupDigits(p.lastPrice)}${NBSP}F/kg</span>
      </a></li>`).join("")}
    </ul></section>` : "";

  const historyRows = history.map((h) => {
    if (h.kind === "pay") {
      return `<li><div class="row top in-38">
        <span class="ev pay">${icon("download", 17, 'stroke-width="2.4"')}</span>
        <span class="row-main"><span class="row-head"><span class="row-title sm">Paiement reçu</span><span class="money in">+${money(h.payment.amount)}</span></span>
          <span class="row-meta">${shortDate(h.at)}</span></span>
      </div></li>`;
    }
    const s = h.sale;
    const product = productOf(state, s.productId);
    const lot = lotOf(state, s.lotId);
    const total = saleTotal(s);
    const status = s.paidAtSale >= total ? `<span class="pill frais">Payé</span>`
      : s.paidAtSale > 0 ? `<span class="pill neutral">Avance ${money(s.paidAtSale)}</span>` : `<span class="pill neutral">À crédit</span>`;
    return `<li><div class="row top in-38">
      ${tile(product, 38)}
      <span class="row-main">
        <span class="row-head"><span class="row-title sm">${esc(product?.name ?? "")} · ${quantity(s.kg)}</span><span class="money">${money(total)}</span></span>
        <span class="row-meta">Vente${NBSP}${s.no} · ${groupDigits(s.pricePerKg)}${NBSP}F/kg${lot ? ` · lot${NBSP}${lot.no}` : ""} · ${shortDate(s.at)}</span>
        <span style="margin-top:4px">${status}</span>
      </span>
    </div></li>`;
  }).join("");

  const historySection = `
    <section class="section"><h2 class="h2">Historique</h2>
      ${segmented("history", [{ value: "all", label: "Tout" }, { value: "sale", label: "Ventes" }, { value: "pay", label: "Paiements" }], filter, "Filtrer l’historique")}
      ${history.length ? `<ol class="group">${historyRows}</ol>` : `<p class="note">Rien à afficher ici pour l’instant.</p>`}
    </section>`;

  return `<section class="screen"><div class="scroll">${header}${accountGroup}${buys}${historySection}</div></section>`;
}

export function bind(root, { state, params, back, refresh }) {
  const buyer = buyerOf(state, params[0]);
  root.querySelector("[data-back]")?.addEventListener("click", () => back("/acheteurs"));
  if (!buyer) return;
  bindSegmented(root, (_, value) => {
    filter = value;
    refresh();
  });
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
    openBuyerSheet(buyer, (values) => {
      updateBuyer(buyer.id, { name: values.name.trim(), type: values.type, place: values.place.trim(), phone: values.phone.trim() });
      toast("Acheteur modifié");
    });
  }));
  root.querySelector("[data-pay]")?.addEventListener("click", () => openPayment(state, buyer));
}

function openPayment(state, buyer) {
  const owed = buyerAccount(state, buyer.id).owed;
  openSheet(
    `<h2 class="sheet-title">Encaisser</h2>
     <p class="sheet-body">${esc(buyer.name)} doit ${money(owed)}.</p>
     <label class="field"><span class="form-label" style="font-size:16px">Montant reçu</span>
       <span class="input-unit"><input inputmode="numeric" autofocus value="${owed}" data-amount><span class="u">F CFA</span></span></label>
     <span class="hint" data-msg>Tout le reste sera soldé.</span>
     <div class="sheet-actions">
       <button type="button" class="btn" data-save>Enregistrer le paiement</button>
       <button type="button" class="btn btn-plain" data-cancel>Annuler</button>
     </div>`,
    (panel, close) => {
      const input = panel.querySelector("[data-amount]");
      const msg = panel.querySelector("[data-msg]");
      const save = panel.querySelector("[data-save]");
      const sync = () => {
        const amount = Math.round(parseNumber(input.value));
        save.disabled = amount <= 0 || amount > owed;
        msg.className = amount > owed ? "hint err" : "hint";
        msg.textContent = amount > owed ? `C’est plus que le montant dû (${money(owed)}).`
          : amount === owed ? "Tout le reste sera soldé." : amount > 0 ? `Il restera ${money(owed - amount)} à payer.` : "";
      };
      input.addEventListener("input", sync);
      sync();
      panel.querySelector("[data-cancel]").addEventListener("click", close);
      save.addEventListener("click", () => {
        const amount = Math.round(parseNumber(input.value));
        close();
        addPayment({ buyerId: buyer.id, amount });
        haptic("success");
        toast(`Paiement de ${money(amount)} enregistré`);
      });
    },
  );
}
