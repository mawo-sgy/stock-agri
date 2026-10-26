// Starts the app: routing between screens, page transitions, tab bar, first-launch welcome.

import { getState, isSetUp, subscribe, startEmpty, startWithSample, askForPersistentStorage } from "./store.js";
import { icon, haptic } from "./ui.js";
import { sacks } from "./illus.js";
import * as stock from "./views/stock.js";
import * as produit from "./views/produit.js";
import * as vente from "./views/vente.js";
import * as arrivage from "./views/arrivage.js";
import * as acheteurs from "./views/acheteurs.js";
import * as acheteur from "./views/acheteur.js";
import * as journal from "./views/journal.js";
import * as reglages from "./views/reglages.js";

// Each route: its view, and for tabs, the tab position (tabs show the tab bar).
const ROUTES = {
  stock: { view: stock, tab: 0 },
  acheteurs: { view: acheteurs, tab: 1 },
  journal: { view: journal, tab: 3 },
  reglages: { view: reglages, tab: 4 },
  produit: { view: produit, depth: 1 },
  acheteur: { view: acheteur, depth: 1 },
  vente: { view: vente, depth: 2 },
  arrivage: { view: arrivage, depth: 2 },
};

const TABS = [
  { route: "stock", label: "Stock", icon: "stock" },
  { route: "acheteurs", label: "Acheteurs", icon: "users" },
  { route: "vente", label: "Vendre", icon: "plus", sell: true },
  { route: "journal", label: "Journal", icon: "journal" },
  { route: "reglages", label: "Réglages", icon: "settings" },
];

const app = document.getElementById("app");
app.innerHTML = `<div id="view"></div>`;
const viewRoot = document.getElementById("view");

let current = null; // { name, params, query }
let visits = 0; // screens opened in this session, so "back" knows whether there is somewhere to go back to
let position = 0; // this screen's place in the browser history, to tell the back button from a new screen
let replacing = false;

/** "#/produit/abc?x=1" -> { name: "produit", params: ["abc"], query } */
function parse(hash) {
  const [path, search = ""] = hash.replace(/^#\/?/, "").split("?");
  const [name = "stock", ...params] = path.split("/").filter(Boolean);
  return { name: ROUTES[name] ? name : "stock", params: params.map(decodeURIComponent), query: new URLSearchParams(search) };
}

/** Opens a path such as "/produit/abc". */
function go(path, { replace = false } = {}) {
  replacing = replace && location.hash !== "#" + path;
  if (replace) location.replace("#" + path);
  else location.hash = path;
}

/** Returns to the previous screen, or to `fallback` when the app was opened directly on this one. */
function back(fallback = "/stock") {
  if (visits > 1) history.back();
  else go(fallback, { replace: true });
}

/** `moved` is "back" or "forward" when she used the browser's own buttons, null for a new screen. */
function direction(from, to, moved) {
  if (!from || from.name === to.name) return null;
  const a = ROUTES[from.name];
  const b = ROUTES[to.name];
  if (a.tab !== undefined && b.tab !== undefined) return b.tab > a.tab ? "tab-right" : "tab-left";
  if (moved) return moved;
  const depth = (r) => r.depth ?? 0;
  return depth(b) >= depth(a) ? "forward" : "back";
}

function tabbar(active) {
  const links = TABS.map((t) => {
    const isActive = t.route === active;
    const glyph = icon(isActive && !t.sell ? `${t.icon}Fill` : t.icon, t.sell ? 20 : 22);
    return `<a class="tab ${t.sell ? "sell" : ""}" href="#/${t.route}" ${isActive ? 'aria-current="page"' : ""} data-tab>
      <span class="ico">${glyph}</span>${t.label}</a>`;
  }).join("");
  return `<nav class="tabbar" aria-label="Navigation principale">${links}</nav>`;
}

/**
 * Renders the current route. `entered` is true on a real navigation, false on a data refresh.
 * `stagger` plays the rows' entrance; pushes skip it because the slide is already the entrance.
 */
function draw(entered, stagger = entered) {
  if (!isSetUp()) return drawWelcome();
  const { view, tab } = ROUTES[current.name];
  const ctx = {
    state: getState(),
    params: current.params,
    query: current.query,
    entered,
    now: new Date(),
    go,
    back,
    refresh: () => draw(false),
  };
  const scrollTop = entered ? 0 : viewRoot.querySelector(".scroll")?.scrollTop ?? 0;
  viewRoot.innerHTML = view.render(ctx) + (tab !== undefined ? tabbar(current.name) : "");
  const scroller = viewRoot.querySelector(".scroll");
  if (scroller) scroller.scrollTop = scrollTop;
  if (stagger) viewRoot.querySelector(".screen")?.classList.add("enter");
  viewRoot.querySelectorAll("[data-tab]").forEach((a) => a.addEventListener("click", () => haptic("medium")));
  view.bind?.(viewRoot, ctx);
}

function route() {
  const target = parse(location.hash || "#/stock");
  // Entries we have seen carry their position; a new entry gets the next one.
  const saved = history.state?.position;
  let moved = null;
  if (typeof saved === "number") {
    if (saved !== position) moved = saved < position ? "back" : "forward";
    position = saved;
  } else {
    if (!replacing) position += 1;
    history.replaceState({ position }, "");
  }
  replacing = false;

  const dir = direction(current, target, moved);
  current = target;
  visits += 1;
  const stagger = !dir || dir.startsWith("tab");
  const update = () => draw(true, stagger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (dir && document.startViewTransition && !reduce) {
    document.documentElement.dataset.nav = dir;
    // A transition cut short by a quick second tap rejects `ready`; the screen still updates.
    document.startViewTransition(update).ready.catch(() => {});
  } else {
    update();
    const fallback = dir && (dir === "back" || dir === "tab-left" ? "drift-from-left" : "drift-from-right");
    if (fallback && !reduce) viewRoot.querySelector(".screen")?.classList.add(fallback);
  }
}

function drawWelcome() {
  viewRoot.innerHTML = `
    <section class="screen welcome">
      <div>
        <h1>Votre stock, vos acheteurs, vos ventes.</h1>
        <p>Notez chaque camion qui arrive, voyez les lots qui restent trop longtemps, et retrouvez en un geste qui a déjà acheté.</p>
      </div>
      <div class="illus-wrap">${sacks}</div>
      <div class="btns">
        <button type="button" class="btn btn-white" data-start="empty">Commencer avec mon stock</button>
        <button type="button" class="btn btn-raised" data-start="sample">Essayer avec des exemples</button>
      </div>
    </section>`;
  const start = (fn) => () => {
    haptic("success");
    fn();
    route();
  };
  viewRoot.querySelector('[data-start="empty"]').addEventListener("click", start(startEmpty));
  viewRoot.querySelector('[data-start="sample"]').addEventListener("click", start(startWithSample));
}

// Data changes (a sale, a relance…) redraw the current screen without replaying entrances.
subscribe(() => {
  if (current) draw(false);
});

window.addEventListener("hashchange", route);
askForPersistentStorage();
route();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
