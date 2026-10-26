// Business rules, as pure functions over the app state.
// Nothing here reads or writes storage, so every rule can be tested on its own (see tests/model.test.mjs).
//
// State shape (all weights in kilograms, all money in F CFA, all dates as ISO strings):
//   products: { id, name, code, color }
//   lots:     { id, no, productId, origin, kgIn, arrivedAt, costPerKg, note }
//   buyers:   { id, name, type: "gros" | "marche" | "part", place, phone, createdAt }
//   sales:    { id, no, lotId, productId, buyerId, kg, pricePerKg, at, paidAtSale }
//   payments: { id, buyerId, saleId, amount, at }
//   events:   { id, kind: "relance" | "edit", at, buyerId, productId, lotId, text }

import { daysBetween } from "./format.js";

/** A lot becomes "lent" after this many days, "bloqué" after BLOCKED_DAYS. */
export const SLOW_DAYS = 30;
export const BLOCKED_DAYS = 60;
export const FRESH_DAYS = 14;
/** A buyer counts as already contacted about a product for this many days after a relance. */
export const CONTACT_MEMORY_DAYS = 7;

export const TYPE_LABELS = { gros: "Grossiste", marche: "Marché", part: "Particulier" };

const byId = (list, id) => list.find((item) => item.id === id);
export const productOf = (state, id) => byId(state.products, id);
export const buyerOf = (state, id) => byId(state.buyers, id);
export const lotOf = (state, id) => byId(state.lots, id);

export const saleTotal = (sale) => Math.round(sale.kg * sale.pricePerKg);

// ---------- Lots ----------

export function lotSoldKg(state, lotId) {
  return state.sales.filter((s) => s.lotId === lotId).reduce((sum, s) => sum + s.kg, 0);
}

export function lotRemainingKg(state, lot) {
  return Math.max(0, lot.kgIn - lotSoldKg(state, lot.id));
}

export const lotAgeDays = (lot, now = new Date()) => daysBetween(lot.arrivedAt, now);

/** "frais" | "encours" | "lent" | "bloque" — the one place the age thresholds live. */
export function ageStatus(days) {
  if (days > BLOCKED_DAYS) return "bloque";
  if (days > SLOW_DAYS) return "lent";
  if (days > FRESH_DAYS) return "encours";
  return "frais";
}

export const isSlow = (days) => days > SLOW_DAYS;

/** Lots that still hold stock, oldest first, each with remaining weight and age. */
export function activeLots(state, now = new Date()) {
  return state.lots
    .map((lot) => ({ ...lot, remainingKg: lotRemainingKg(state, lot), ageDays: lotAgeDays(lot, now) }))
    .filter((lot) => lot.remainingKg > 0)
    .sort((a, b) => new Date(a.arrivedAt) - new Date(b.arrivedAt));
}

export function stockSummary(state, now = new Date()) {
  const lots = activeLots(state, now);
  const slow = lots.filter((l) => isSlow(l.ageDays));
  return {
    totalKg: lots.reduce((sum, l) => sum + l.remainingKg, 0),
    lotCount: lots.length,
    productCount: new Set(lots.map((l) => l.productId)).size,
    slowCount: slow.length,
    lots,
    slow,
    others: lots.filter((l) => !isSlow(l.ageDays)),
  };
}

export const nextLotNo = (state) => state.lots.reduce((max, l) => Math.max(max, l.no), 0) + 1;
export const nextSaleNo = (state) => state.sales.reduce((max, s) => Math.max(max, s.no), 0) + 1;

// ---------- Products ----------

export function productStats(state, productId, now = new Date()) {
  const lots = activeLots(state, now).filter((l) => l.productId === productId);
  const sales = state.sales
    .filter((s) => s.productId === productId)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const recent = sales.filter((s) => daysBetween(s.at, now) <= 30);
  const weighted = (list) => {
    const kg = list.reduce((sum, s) => sum + s.kg, 0);
    return kg ? Math.round(list.reduce((sum, s) => sum + s.kg * s.pricePerKg, 0) / kg) : null;
  };
  return {
    lots,
    totalKg: lots.reduce((sum, l) => sum + l.remainingKg, 0),
    lastPrice: sales[0]?.pricePerKg ?? null,
    average30: weighted(recent),
  };
}

/** True when she wrote to this buyer about this product in the last CONTACT_MEMORY_DAYS days. */
export function contactedRecently(state, buyerId, productId, now = new Date()) {
  return state.events.some(
    (e) => e.kind === "relance" && e.buyerId === buyerId && e.productId === productId &&
      daysBetween(e.at, now) < CONTACT_MEMORY_DAYS,
  );
}

/** Everyone who ever bought this product, with their last purchase of it. */
export function productBuyers(state, productId, now = new Date()) {
  const rows = new Map();
  for (const sale of state.sales.filter((s) => s.productId === productId)) {
    const row = rows.get(sale.buyerId) ?? { buyerId: sale.buyerId, times: 0, totalKg: 0, last: null };
    row.times += 1;
    row.totalKg += sale.kg;
    if (!row.last || new Date(sale.at) > new Date(row.last.at)) row.last = sale;
    rows.set(sale.buyerId, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, buyer: buyerOf(state, row.buyerId), contacted: contactedRecently(state, row.buyerId, productId, now) }))
    .filter((row) => row.buyer);
}

/** How many past buyers of a product she has not written to recently. */
export function buyersToFollowUp(state, productId, now = new Date()) {
  return productBuyers(state, productId, now).filter((row) => !row.contacted).length;
}

/** Two-letter code from a product name: "Gingembre" -> "Gi". */
export function codeFor(name) {
  const letters = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "");
  return (letters.charAt(0).toUpperCase() + letters.charAt(1).toLowerCase()) || "?";
}

export function productHasStock(state, productId) {
  return state.lots.some((l) => l.productId === productId && lotRemainingKg(state, l) > 0);
}

export function productHasHistory(state, productId) {
  return state.lots.some((l) => l.productId === productId) || state.sales.some((s) => s.productId === productId);
}

// ---------- Buyers ----------

export function buyerAccount(state, buyerId) {
  const sales = state.sales.filter((s) => s.buyerId === buyerId);
  const amount = sales.reduce((sum, s) => sum + saleTotal(s), 0);
  const paidAtSale = sales.reduce((sum, s) => sum + (s.paidAtSale ?? 0), 0);
  const paidLater = state.payments.filter((p) => p.buyerId === buyerId).reduce((sum, p) => sum + p.amount, 0);
  const lastSale = [...sales].sort((a, b) => new Date(b.at) - new Date(a.at))[0] ?? null;
  return {
    count: sales.length,
    totalKg: sales.reduce((sum, s) => sum + s.kg, 0),
    amount,
    owed: Math.max(0, amount - paidAtSale - paidLater),
    lastSale,
  };
}

/** What a buyer buys, per product: weight, count, first and last price. */
export function buyerProducts(state, buyerId) {
  const rows = new Map();
  const sales = state.sales.filter((s) => s.buyerId === buyerId).sort((a, b) => new Date(a.at) - new Date(b.at));
  for (const sale of sales) {
    const row = rows.get(sale.productId) ?? { productId: sale.productId, kg: 0, count: 0, firstPrice: sale.pricePerKg, lastPrice: 0 };
    row.kg += sale.kg;
    row.count += 1;
    row.lastPrice = sale.pricePerKg;
    rows.set(sale.productId, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, product: productOf(state, row.productId) }))
    .filter((row) => row.product)
    .sort((a, b) => b.kg - a.kg);
}

/** Sales and payments of one buyer, newest first. */
export function buyerHistory(state, buyerId) {
  const sales = state.sales.filter((s) => s.buyerId === buyerId).map((s) => ({ kind: "sale", at: s.at, sale: s }));
  const payments = state.payments.filter((p) => p.buyerId === buyerId).map((p) => ({ kind: "pay", at: p.at, payment: p }));
  return [...sales, ...payments].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Buyers sorted by most recent purchase (buyers without purchases last, newest first). */
export function buyersByRecency(state) {
  return state.buyers
    .map((buyer) => ({ buyer, account: buyerAccount(state, buyer.id) }))
    .sort((a, b) => {
      const ta = a.account.lastSale ? new Date(a.account.lastSale.at) : new Date(a.buyer.createdAt ?? 0);
      const tb = b.account.lastSale ? new Date(b.account.lastSale.at) : new Date(b.buyer.createdAt ?? 0);
      return tb - ta;
    });
}

// ---------- Journal ----------

/** Every action, newest first, as { kind, at, ...refs }. */
export function journal(state) {
  const items = [
    ...state.lots.map((lot) => ({ kind: "arrival", at: lot.arrivedAt, lot })),
    ...state.sales.map((sale) => ({ kind: "sale", at: sale.at, sale })),
    ...state.payments.map((payment) => ({ kind: "pay", at: payment.at, payment })),
    ...state.events.map((event) => ({ kind: event.kind, at: event.at, event })),
  ];
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}
