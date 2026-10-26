// New arrival: a truck came in. Creates the next numbered lot.

import { productOf, nextLotNo } from "../model.js";
import { parseNumber, decimal, quantity, money, inputDate, shortDate, NBSP } from "../format.js";
import { esc, icon, segmented, bindSegmented, haptic } from "../ui.js";
import { addLot } from "../store.js";

const ORIGINS = ["Mali", "Burkina Faso", "Côte d’Ivoire", "Kenya", "Tanzanie"];

let draft = null;
let saved = null; // the lot just created, shown on the confirmation screen

function freshDraft(state, query) {
  return {
    productId: query.get("product") ?? state.products[0]?.id ?? null,
    origin: ORIGINS[0],
    otherOrigin: "",
    tons: "",
    when: "today",
    date: inputDate(new Date()),
    cost: "",
    note: "",
  };
}

function arrivalDate(d) {
  const day = new Date();
  if (d.when === "yesterday") day.setDate(day.getDate() - 1);
  if (d.when === "other" && d.date) return new Date(d.date + "T09:00:00").toISOString();
  return day.toISOString();
}

const originOf = (d) => (d.origin === "Autre" ? d.otherOrigin.trim() : d.origin);

function problem(d) {
  if (!d.productId) return "Choisissez un produit";
  if (!originOf(d)) return "Indiquez l’origine";
  if (parseNumber(d.tons) <= 0) return "Indiquez le poids reçu";
  return "";
}

export function render({ state, query, entered }) {
  if (entered || !draft) {
    draft = freshDraft(state, query);
    saved = null;
  }
  if (saved) return renderDone(state);
  const d = draft;
  const no = nextLotNo(state);
  const product = productOf(state, d.productId);
  const block = problem(d);

  return `<section class="screen">
    <header class="hdr pushed" style="gap:12px">
      <button type="button" class="cancel" data-cancel>${icon("close", 18, 'stroke-width="2.4"')}Annuler</button>
      <h1 class="title">Nouvel arrivage</h1>
    </header>
    <div class="scroll pad-top" style="gap:24px">
      <fieldset><legend class="form-label">Produit</legend>
        <div class="chips wrap">
          ${state.products.map((p) => `<button type="button" class="chip prod" aria-pressed="${p.id === d.productId}" data-product="${esc(p.id)}">
            <span class="dot" style="--c:${esc(p.color)}">${esc(p.code)}</span>${esc(p.name)}</button>`).join("")}
        </div>
      </fieldset>

      <fieldset><legend class="form-label">Origine</legend>
        <ul class="group">
          ${[...ORIGINS, "Autre"].map((o) => `<li><button type="button" class="choice row" aria-pressed="${o === d.origin}" data-origin="${esc(o)}">
            <span class="grow">${o === "Autre" ? "Autre pays" : esc(o)}</span>
            <span class="mark">${o === d.origin ? icon("check", 20, 'stroke-width="2.8"') : ""}</span>
          </button></li>`).join("")}
        </ul>
        ${d.origin === "Autre" ? `<input class="input" placeholder="Nom du pays" value="${esc(d.otherOrigin)}" data-field="otherOrigin" aria-label="Autre pays">` : ""}
      </fieldset>

      <div class="field">
        <label class="form-label" for="ar-tons">Poids reçu</label>
        <div class="stepper">
          <button type="button" aria-label="Retirer une tonne" data-step="-1">${icon("minus", 22, 'stroke-width="2.4"')}</button>
          <span class="value"><input id="ar-tons" inputmode="decimal" placeholder="0" value="${esc(d.tons)}" data-field="tons"><span class="u">t</span></span>
          <button type="button" class="plus" aria-label="Ajouter une tonne" data-step="1">${icon("plus", 22, 'stroke-width="2.4"')}</button>
        </div>
        <span class="hint">Poids de la bascule. Vous pourrez le corriger plus tard.</span>
      </div>

      <fieldset><legend class="form-label">Arrivé</legend>
        ${segmented("when", [{ value: "today", label: "Aujourd’hui" }, { value: "yesterday", label: "Hier" }, { value: "other", label: "Autre date" }], d.when, "Date d’arrivée")}
        ${d.when === "other" ? `<input class="input" type="date" value="${esc(d.date)}" max="${inputDate(new Date())}" data-field="date" aria-label="Date d’arrivée">` : ""}
      </fieldset>

      <div class="field">
        <span class="form-label">Facultatif</span>
        <div class="group">
          <div class="form-row row" style="min-height:56px;padding:0 16px"><label for="ar-cost">Prix d’achat</label>
            <input id="ar-cost" inputmode="numeric" placeholder="F par kg" value="${esc(d.cost)}" data-field="cost"></div>
          <div class="form-row row" style="min-height:56px;padding:0 16px"><label for="ar-note">Note</label>
            <input id="ar-note" placeholder="Camion, fournisseur…" value="${esc(d.note)}" data-field="note"></div>
        </div>
        <span class="hint" data-cost-hint></span>
      </div>
    </div>
    <div class="footer">
      <span class="footer-note" data-preview>${esc(`Sera enregistré comme lot${NBSP}${no} · ${product?.name ?? ""} · ${originOf(d) || "…"}`)}</span>
      <button type="button" class="btn" data-save ${block ? "disabled" : ""}>${block || "Enregistrer l’arrivage"}</button>
    </div>
  </section>`;
}

function renderDone(state) {
  const lot = saved;
  const product = productOf(state, lot.productId);
  return `<section class="screen">
    <header class="hdr pushed" style="gap:12px">
      <a class="cancel" href="#/stock">${icon("close", 18, 'stroke-width="2.4"')}Terminé</a>
      <h1 class="title">C’est noté</h1>
    </header>
    <div class="scroll" style="padding:0">
      <div class="done">
        <div class="done-head">
          <span class="done-ring">${icon("check", 34, 'stroke="#fff" stroke-width="2.6"')}</span>
          <span class="done-title">Lot${NBSP}${lot.no} ajouté au stock</span>
          <span class="done-sub">Il apparaît aussi dans le journal.</span>
        </div>
        <dl class="group" style="margin:0">
          <div class="row kv"><dt class="k">Produit</dt><dd class="v" style="margin:0">${esc(product?.name ?? "")}</dd></div>
          <div class="row kv"><dt class="k">Origine</dt><dd class="v" style="margin:0">${esc(lot.origin)}</dd></div>
          <div class="row kv"><dt class="k">Poids</dt><dd class="v" style="margin:0">${quantity(lot.kgIn)}</dd></div>
          <div class="row kv"><dt class="k">Arrivée</dt><dd class="v" style="margin:0">${shortDate(lot.arrivedAt)}</dd></div>
        </dl>
        <div class="btn-row later">
          <a class="btn" href="#/produit/${esc(lot.productId)}">Voir le produit</a>
          <button type="button" class="btn btn-tonal" data-again>Autre arrivage</button>
        </div>
      </div>
    </div>
  </section>`;
}

/** Updates the parts that depend on what she types, without redrawing the inputs. */
function updateLive(root, state) {
  const d = draft;
  const block = problem(d);
  const save = root.querySelector("[data-save]");
  save.disabled = Boolean(block);
  save.textContent = block || "Enregistrer l’arrivage";
  const product = productOf(state, d.productId);
  root.querySelector("[data-preview]").textContent = `Sera enregistré comme lot${NBSP}${nextLotNo(state)} · ${product?.name ?? ""} · ${originOf(d) || "…"}`;
  const cost = parseNumber(d.cost);
  const kg = parseNumber(d.tons) * 1000;
  root.querySelector("[data-cost-hint]").textContent = cost > 0 && kg > 0 ? `Valeur d’achat du lot : environ ${money(cost * kg)}` : "";
}

export function bind(root, { state, back, refresh }) {
  root.querySelector("[data-cancel]")?.addEventListener("click", () => back("/stock"));
  if (saved) {
    root.querySelector("[data-again]")?.addEventListener("click", () => {
      draft = freshDraft(state, new URLSearchParams());
      saved = null;
      refresh();
    });
    haptic("success");
    return;
  }
  root.querySelectorAll("[data-product]").forEach((b) => b.addEventListener("click", () => {
    draft.productId = b.dataset.product;
    haptic("light");
    refresh();
  }));
  root.querySelectorAll("[data-origin]").forEach((b) => b.addEventListener("click", () => {
    draft.origin = b.dataset.origin;
    haptic("light");
    refresh();
  }));
  root.querySelectorAll("[data-field]").forEach((input) => input.addEventListener("input", () => {
    draft[input.dataset.field] = input.value;
    updateLive(root, state);
  }));
  root.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const next = Math.max(0, parseNumber(draft.tons) + Number(b.dataset.step));
    draft.tons = decimal(next, 2).replace(/\s| /g, "");
    root.querySelector('[data-field="tons"]').value = draft.tons;
    haptic("light");
    updateLive(root, state);
  }));
  bindSegmented(root, (_, value) => {
    draft.when = value;
    refresh();
  });
  root.querySelector("[data-save]").addEventListener("click", () => {
    if (problem(draft)) return;
    saved = addLot({
      productId: draft.productId,
      origin: originOf(draft),
      kgIn: parseNumber(draft.tons) * 1000,
      arrivedAt: arrivalDate(draft),
      costPerKg: parseNumber(draft.cost),
      note: draft.note,
    });
    refresh();
  });
  updateLive(root, state);
}
