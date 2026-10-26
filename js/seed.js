// Sample data, dated relative to today, so she can try the app before entering her own stock.
// Every name, weight and price here is invented. Réglages shows a banner while it is loaded.

import { codeFor } from "./model.js";

/** Date `days` ago at hh:mm, as ISO. */
function daysAgo(days, hh = 9, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

export function sampleState(newId) {
  const product = (name, color) => ({ id: newId(), name, code: codeFor(name), color });
  const gin = product("Gingembre", "#9A5A22");
  const hib = product("Hibiscus", "#A3324F");
  const mil = product("Mil", "#2E6E8E");
  const mai = product("Maïs", "#846812");
  const sor = product("Sorgho", "#6D4396");

  const lot = (no, p, origin, kgIn, days, note = "") => ({
    id: newId(), no, productId: p.id, origin, kgIn, arrivedAt: daysAgo(days, 8, 0), costPerKg: null, note,
  });
  // Sold-out lots that explain the older purchases.
  const l4 = lot(4, gin, "Côte d’Ivoire", 2000, 130);
  const l7 = lot(7, sor, "Burkina Faso", 4000, 75);
  const l9 = lot(9, mil, "Mali", 6000, 60);
  // Lots in stock today.
  const l11 = lot(11, hib, "Burkina Faso", 4500, 67);
  const l12 = lot(12, gin, "Côte d’Ivoire", 18200, 54);
  const l13 = lot(13, mai, "Tanzanie", 33000, 41);
  const l14 = lot(14, sor, "Burkina Faso", 14000, 22);
  const l15 = lot(15, hib, "Mali", 18000, 12);
  const l16 = lot(16, mil, "Mali", 30000, 8);
  const l17 = lot(17, gin, "Tanzanie", 6000, 3, "Camion via Dar es Salaam");

  const buyer = (name, type, place, days) => ({ id: newId(), name, type, place, phone: "", createdAt: daysAgo(days) });
  const moussa = buyer("Moussa Ndiaye", "gros", "Thiaroye", 140);
  const cheikh = buyer("Cheikh Mbaye", "gros", "Kaolack", 90);
  const khady = buyer("Khady Diallo", "marche", "Sandaga", 80);
  const aissatou = buyer("Aïssatou Fall", "marche", "Castors", 100);
  const mariama = buyer("Mariama Ba", "part", "Liberté 6", 60);
  const ibrahima = buyer("Ibrahima Sarr", "gros", "Touba", 70);
  const fatou = buyer("Fatou Sène", "marche", "Tilène", 50);

  let no = 175;
  const sale = (l, b, kg, pricePerKg, days, hh, paidRatio = 1, paidAtSale) => ({
    id: newId(), no: ++no, lotId: l.id, productId: l.productId, buyerId: b.id, kg, pricePerKg,
    at: daysAgo(days, hh, 10), paidAtSale: paidAtSale ?? Math.round(kg * pricePerKg * paidRatio),
  });
  const sales = [
    sale(l4, moussa, 2000, 1150, 117, 10),
    sale(l7, moussa, 4000, 270, 68, 11),
    sale(l9, moussa, 6000, 290, 53, 9),
    sale(l12, fatou, 250, 1300, 40, 15),
    sale(l12, ibrahima, 5000, 1050, 34, 10),
    sale(l12, mariama, 50, 1400, 23, 17),
    sale(l12, aissatou, 400, 1250, 16, 12),
    sale(l12, moussa, 3000, 1100, 11, 10, 0, 1_500_000),
    sale(l11, khady, 300, 1900, 5, 15, 0, 420_000),
    sale(l13, cheikh, 8000, 225, 2, 11),
  ];

  const event = (kind, days, hh, mm, fields) => ({ id: newId(), kind, at: daysAgo(days, hh, mm), ...fields });
  const events = [
    event("relance", 0, 9, 40, { buyerId: aissatou.id, productId: gin.id, lotId: l12.id }),
    event("relance", 0, 9, 55, { buyerId: mariama.id, productId: gin.id, lotId: l12.id }),
    event("relance", 0, 10, 12, { buyerId: ibrahima.id, productId: gin.id, lotId: l12.id }),
    event("relance", 1, 9, 30, { buyerId: moussa.id, productId: gin.id, lotId: l12.id }),
    event("relance", 2, 8, 45, { buyerId: cheikh.id, productId: mai.id, lotId: l13.id }),
    event("edit", 5, 10, 0, { lotId: l13.id, text: "Lot 13 corrigé", detail: "Maïs : 33,4 t → 33 t après pesée" }),
    event("edit", 8, 7, 30, { text: "Produit renommé", detail: "« Bissap » devient Hibiscus" }),
  ];

  return {
    version: 1,
    products: [gin, hib, mil, mai, sor],
    lots: [l4, l7, l9, l11, l12, l13, l14, l15, l16, l17],
    buyers: [moussa, cheikh, khady, aissatou, mariama, ibrahima, fatou],
    sales,
    payments: [{ id: newId(), buyerId: moussa.id, saleId: null, amount: 500_000, at: daysAgo(1, 16, 10) }],
    events,
    settings: { sample: true, vibrations: true },
  };
}
