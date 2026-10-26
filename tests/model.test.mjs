// Logic tests for the data model and French formatting. Run from app/: node --test tests/model.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleState } from "../js/seed.js";
import {
  ageStatus, isSlow, stockSummary, lotRemainingKg, buyerAccount, productStats,
  codeFor, nextSaleNo, journal, buyersToFollowUp,
} from "../js/model.js";
import { groupDigits, decimal, quantity, money, moneyShort, parseNumber, NBSP } from "../js/format.js";

let n = 0;
const state = sampleState(() => `id${++n}`);
const buyer = (name) => state.buyers.find((b) => b.name === name);
const product = (name) => state.products.find((p) => p.name === name);

test("age thresholds: fresh ≤14, in progress ≤30, slow >30, blocked >60", () => {
  assert.equal(ageStatus(14), "frais");
  assert.equal(ageStatus(15), "encours");
  assert.equal(ageStatus(30), "encours");
  assert.equal(ageStatus(31), "lent");
  assert.equal(ageStatus(60), "lent");
  assert.equal(ageStatus(61), "bloque");
  assert.equal(isSlow(30), false);
  assert.equal(isSlow(61), true); // blocked lots count as slow
});

test("stock summary: sold-out lots drop out, blocked lots stay in the slow count", () => {
  const summary = stockSummary(state);
  const nos = summary.lots.map((l) => l.no);
  for (const soldOut of [4, 7, 9]) assert.ok(!nos.includes(soldOut), `lot ${soldOut} is sold out`);
  assert.deepEqual(summary.slow.map((l) => l.no), [11, 12, 13]);
  assert.equal(summary.slowCount, 3);
  assert.equal(summary.totalKg, summary.lots.reduce((s, l) => s + l.remainingKg, 0));
});

test("remaining weight never goes below zero", () => {
  const lot = state.lots.find((l) => l.no === 11);
  const sold = state.sales.filter((s) => s.lotId === lot.id).reduce((sum, s) => sum + s.kg, 0);
  assert.equal(lotRemainingKg(state, lot), 4500 - sold);
  const oversold = { ...state, sales: [...state.sales, { lotId: lot.id, kg: 99999 }] };
  assert.equal(lotRemainingKg(oversold, lot), 0);
});

test("buyer accounts: what Moussa and Khady still owe", () => {
  assert.equal(buyerAccount(state, buyer("Moussa Ndiaye").id).owed, 1_300_000);
  const khady = state.buyers.find((b) => b.name.startsWith("Khady"));
  assert.equal(buyerAccount(state, khady.id).owed, 150_000);
});

test("product stats: 30-day average is weighted by weight", () => {
  const id = product("Gingembre").id;
  const stats = productStats(state, id);
  const recent = state.sales.filter((s) => s.productId === id && (Date.now() - new Date(s.at)) / 864e5 <= 30);
  if (recent.length) {
    const kg = recent.reduce((s, x) => s + x.kg, 0);
    assert.equal(stats.average30, Math.round(recent.reduce((s, x) => s + x.kg * x.pricePerKg, 0) / kg));
  }
  assert.ok(stats.lastPrice > 0);
});

test("follow-ups and numbering", () => {
  assert.equal(codeFor("Gingembre"), "Gi");
  assert.equal(nextSaleNo(state), Math.max(...state.sales.map((s) => s.no)) + 1);
  assert.ok(buyersToFollowUp(state, product("Hibiscus").id) >= 0);
  const items = journal(state);
  for (let i = 1; i < items.length; i++) assert.ok(new Date(items[i - 1].at) >= new Date(items[i].at), "journal is newest first");
});

test("French formatting uses non-breaking spaces and decimal commas", () => {
  assert.equal(groupDigits(1300000), `1${NBSP}300${NBSP}000`);
  assert.equal(money(150000), `150${NBSP}000${NBSP}F`);
  assert.equal(decimal(4.25), "4,3");
  assert.equal(decimal(30), "30");
  assert.equal(quantity(4200), `4,2${NBSP}t`);
  assert.equal(quantity(400), `400${NBSP}kg`);
  assert.equal(moneyShort(1300000), `1,3${NBSP}M${NBSP}F`);
  assert.equal(parseNumber("1 150"), 1150);
  assert.equal(parseNumber("2,5"), 2.5);
  assert.equal(parseNumber(""), 0);
});
