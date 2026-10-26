// The one place that reads and writes her data.
// Today it is the phone's storage (localStorage). To move to Supabase later, keep these
// function names and replace their bodies; the screens never touch storage directly.

import { codeFor, nextLotNo, nextSaleNo, productOf, lotOf } from "./model.js";
import { sampleState } from "./seed.js";
import { quantity } from "./format.js";

const KEY = "stock-agri/v1";
const SCHEMA_VERSION = 1;

export const PRODUCT_COLORS = ["#9A5A22", "#A3324F", "#2E6E8E", "#846812", "#6D4396", "#4A5560"];

export const DEFAULT_PRODUCTS = [
  { name: "Gingembre", color: "#9A5A22" },
  { name: "Hibiscus", color: "#A3324F" },
  { name: "Mil", color: "#2E6E8E" },
  { name: "Maïs", color: "#846812" },
  { name: "Sorgho", color: "#6D4396" },
];

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const nowIso = () => new Date().toISOString();

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    products: DEFAULT_PRODUCTS.map((p) => ({ id: newId(), name: p.name, code: codeFor(p.name), color: p.color })),
    lots: [],
    buyers: [],
    sales: [],
    payments: [],
    events: [],
    settings: { sample: false, vibrations: true },
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let state = read();
const listeners = new Set();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Enregistrement impossible", error);
    return false;
  }
}

/** Applies a change to a copy of the state, saves it, then tells the screens. */
function commit(change) {
  const next = structuredClone(state);
  const result = change(next);
  state = next;
  const saved = write();
  listeners.forEach((listener) => listener(state));
  if (!saved) throw new Error("Le téléphone n’a plus de place pour enregistrer.");
  return result;
}

export const getState = () => state;
export const isSetUp = () => state !== null;
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Asks the browser not to clear her data when the phone is short on space. */
export function askForPersistentStorage() {
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
}

// ---------- First launch ----------

export function startEmpty() {
  state = emptyState();
  write();
  listeners.forEach((l) => l(state));
}

export function startWithSample() {
  state = sampleState(newId);
  write();
  listeners.forEach((l) => l(state));
}

// ---------- Stock ----------

export function addLot({ productId, origin, kgIn, arrivedAt, costPerKg, note }) {
  return commit((s) => {
    const lot = {
      id: newId(), no: nextLotNo(s), productId, origin, kgIn: Math.round(kgIn),
      arrivedAt: arrivedAt ?? nowIso(), costPerKg: costPerKg || null, note: note?.trim() || "",
    };
    s.lots.push(lot);
    return lot;
  });
}

export function correctLotWeight(lotId, kgIn) {
  return commit((s) => {
    const lot = lotOf(s, lotId);
    const product = productOf(s, lot.productId);
    s.events.push({
      id: newId(), kind: "edit", at: nowIso(), lotId,
      text: `Lot ${lot.no} corrigé`,
      detail: `${product?.name ?? ""} : ${quantity(lot.kgIn)} → ${quantity(kgIn)}`,
    });
    lot.kgIn = Math.round(kgIn);
  });
}

// ---------- Sales and payments ----------

/** Records a sale. `buyer` is either an existing buyer id or a new buyer's name. */
export function addSale({ productId, lotId, buyerId, newBuyerName, kg, pricePerKg, paidAtSale, at }) {
  return commit((s) => {
    let id = buyerId;
    if (!id) {
      const buyer = { id: newId(), name: newBuyerName.trim(), type: "part", place: "", phone: "", createdAt: nowIso() };
      s.buyers.push(buyer);
      id = buyer.id;
    }
    const sale = {
      id: newId(), no: nextSaleNo(s), lotId, productId, buyerId: id,
      kg: Math.round(kg), pricePerKg: Math.round(pricePerKg), at: at ?? nowIso(), paidAtSale: Math.round(paidAtSale),
    };
    s.sales.push(sale);
    return sale;
  });
}

export function addPayment({ buyerId, amount }) {
  return commit((s) => {
    const payment = { id: newId(), buyerId, saleId: null, amount: Math.round(amount), at: nowIso() };
    s.payments.push(payment);
    return payment;
  });
}

// ---------- Buyers ----------

export function addBuyer({ name, type, place, phone }) {
  return commit((s) => {
    const buyer = { id: newId(), name: name.trim(), type, place: place.trim(), phone: phone.trim(), createdAt: nowIso() };
    s.buyers.push(buyer);
    return buyer;
  });
}

export function updateBuyer(id, patch) {
  return commit((s) => {
    const buyer = s.buyers.find((b) => b.id === id);
    Object.assign(buyer, patch);
  });
}

/** She wrote to this buyer (WhatsApp) about a product: remembered for the journal and the follow-up count. */
export function logRelance({ buyerId, productId, lotId }) {
  return commit((s) => {
    s.events.push({ id: newId(), kind: "relance", at: nowIso(), buyerId, productId, lotId: lotId ?? null });
  });
}

// ---------- Products ----------

export function saveProduct({ id, name, color }) {
  return commit((s) => {
    const clean = name.trim();
    if (!id) {
      s.products.push({ id: newId(), name: clean, code: codeFor(clean), color });
      s.events.push({ id: newId(), kind: "edit", at: nowIso(), text: "Produit ajouté", detail: clean });
      return;
    }
    const product = productOf(s, id);
    if (product.name !== clean) {
      s.events.push({ id: newId(), kind: "edit", at: nowIso(), text: "Produit renommé", detail: `« ${product.name} » devient ${clean}` });
    }
    Object.assign(product, { name: clean, code: codeFor(clean), color });
  });
}

export function deleteProduct(id) {
  return commit((s) => {
    const product = productOf(s, id);
    s.products = s.products.filter((p) => p.id !== id);
    s.events.push({ id: newId(), kind: "edit", at: nowIso(), text: "Produit supprimé", detail: product?.name ?? "" });
  });
}

// ---------- Settings and backup ----------

export function setSetting(key, value) {
  return commit((s) => {
    s.settings[key] = value;
  });
}

export function exportBackup() {
  return JSON.stringify({ app: "stock-agri", exportedAt: nowIso(), state }, null, 2);
}

/** Reads a backup file without changing anything. Throws a French message when the file is not a backup. */
export function readBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n’est pas une sauvegarde de l’application.");
  }
  const next = parsed?.state;
  const lists = ["products", "lots", "buyers", "sales", "payments", "events"];
  if (parsed?.app !== "stock-agri" || !next || !lists.every((k) => Array.isArray(next[k]))) {
    throw new Error("Ce fichier n’est pas une sauvegarde de l’application.");
  }
  return { exportedAt: parsed.exportedAt ?? null, state: next };
}

/** Replaces all data with a backup file's content. */
export function importBackup(text) {
  const next = readBackup(text).state;
  state = { ...next, settings: { sample: false, vibrations: true, ...next.settings } };
  write();
  listeners.forEach((l) => l(state));
}

/** Clears everything and starts again from an empty stock with the five usual products. */
export function eraseAll() {
  startEmpty();
}
