// Shared interface pieces: icons, haptics, escaping, tiles, pills, sheets, toasts.

import { getState } from "./store.js";
import { ageStatus } from "./model.js";
import { NBSP } from "./format.js";

// ---------- Text safety ----------

/** Escapes text before it goes into HTML (names and notes are typed by her). */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** "de Moussa" / "d’Aïssatou": French elision before a vowel or a mute h. */
export function deName(name) {
  return /^[aeiouyhàâäéèêëîïôöûüœ]/i.test(name) ? `d’${name}` : `de ${name}`;
}

// Countries named with "le": "du Mali", but "de Tanzanie", "de Côte d’Ivoire".
const MASCULINE_COUNTRIES = ["Mali", "Burkina Faso", "Kenya", "Sénégal", "Niger", "Nigeria", "Ghana", "Togo", "Bénin", "Cameroun", "Maroc"];

/** "du Mali" / "de Tanzanie" / "d’Éthiopie". */
export function fromOrigin(origin) {
  return MASCULINE_COUNTRIES.includes(origin) ? `du ${origin}` : deName(origin);
}

// ---------- Icons: one thin line set, with filled versions for the active tab ----------

const LINE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const PATHS = {
  stock: `<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>`,
  stockFill: `<path d="M12 2.6 20.9 7.4v9.2L12 21.4 3.1 16.6V7.4z" fill="currentColor"/><path d="M3.8 8 12 12.4 20.2 8M12 12.4v8.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`,
  users: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M21.5 20a6.5 6.5 0 0 0-4.5-6.2"/>`,
  usersFill: `<circle cx="9" cy="8" r="4" fill="currentColor"/><path d="M2 20.5a7 7 0 0 1 14 0z" fill="currentColor"/><path d="M16 4.3a3.7 3.7 0 0 1 0 7.4M17.3 13.6A7 7 0 0 1 22 20.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  journal: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
  journalFill: `<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M12 7.2V12l3.2 2.1" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  settings: `<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>`,
  settingsFill: `<path d="M4 7h9M17 7h3M4 17h3M11 17h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.8" fill="currentColor"/><circle cx="9" cy="17" r="2.8" fill="currentColor"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
  back: `<path d="m15 6-6 6 6 6"/>`,
  chevron: `<path d="m9 6 6 6-6 6"/>`,
  down: `<path d="m6 9 6 6 6-6"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  chat: `<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.4A8.4 8.4 0 1 1 21 11.5z"/>`,
  phone: `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>`,
  sale: `<path d="M7 17 17 7"/><path d="M8 7h9v9"/>`,
  cash: `<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>`,
  pencil: `<path d="M4 20h4L19 9l-4-4L4 16z"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  download: `<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>`,
  upload: `<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>`,
  trash: `<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>`,
};

/** <svg> for an icon name. Names ending in "Fill" are drawn filled. */
export function icon(name, size = 22, extra = "") {
  const filled = name.endsWith("Fill");
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${filled ? "" : LINE} aria-hidden="true" ${extra}>${PATHS[name]}</svg>`;
}

// ---------- Haptics ----------
// Phones that allow it (Android) vibrate lightly on taps and more firmly on confirmations.
// iPhones do not let web apps vibrate, except the native switch used in Réglages.

const PATTERNS = { light: 8, medium: 16, heavy: 26, success: [14, 70, 22], warning: [24, 50, 24] };

export function haptic(kind = "light") {
  if (getState()?.settings?.vibrations === false) return;
  if ("vibrate" in navigator) navigator.vibrate(PATTERNS[kind] ?? PATTERNS.light);
}

// ---------- Small pieces ----------

/** Product tile with its two-letter code. */
export function tile(product, size = 44) {
  const fontSize = size >= 52 ? 18 : size >= 44 ? 15 : 14;
  const radius = size >= 52 ? 14 : 12;
  return `<span class="tile" aria-hidden="true" style="--c:${esc(product?.color ?? "#4A5560")};--s:${size}px;--r:${radius}px;font-size:${fontSize}px">${esc(product?.code ?? "?")}</span>`;
}

/** Initials avatar tinted by buyer type. */
export function avatar(buyer, size = 46) {
  const initials = buyer.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return `<span class="avatar t-${esc(buyer.type)}" aria-hidden="true" style="--s:${size}px;font-size:${Math.round(size * 0.35)}px">${esc(initials)}</span>`;
}

/** Age pill: "54 j · lent". */
export function agePill(days) {
  const status = ageStatus(days);
  const words = { frais: " · frais", encours: "", lent: " · lent", bloque: " · bloqué" };
  return `<span class="pill ${status}">${days}${NBSP}j${words[status]}</span>`;
}

/** A figure with a quieter unit: figure("4,2", "t"). */
export function figure(value, unit, cls = "") {
  return `<span class="fig ${cls}">${value}<span class="unit">${NBSP}${unit}</span></span>`;
}

/** Segmented control. Options: [{ value, label }]. The thumb slides to the selected option. */
export function segmented(name, options, selected, label = "") {
  const index = Math.max(0, options.findIndex((o) => o.value === selected));
  const buttons = options
    .map((o) => `<button type="button" data-seg="${esc(name)}" data-value="${esc(o.value)}" aria-pressed="${o.value === selected}">${esc(o.label)}</button>`)
    .join("");
  return `<div class="seg" role="group" aria-label="${esc(label)}" style="--n:${options.length};--i:${index}"><span class="seg-thumb" aria-hidden="true"></span>${buttons}</div>`;
}

/**
 * Makes every segmented control inside `root` animate its thumb first,
 * then calls onChange(name, value) once the slide has started.
 */
export function bindSegmented(root, onChange) {
  root.querySelectorAll("[data-seg]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".seg");
      const all = [...group.querySelectorAll("[data-seg]")];
      group.style.setProperty("--i", all.indexOf(button));
      all.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      haptic("light");
      setTimeout(() => onChange(button.dataset.seg, button.dataset.value), 140);
    });
  });
}

// ---------- WhatsApp and phone links ----------

/** Digits for wa.me: Senegal numbers typed as "77 123 45 67" get the 221 country code. */
export function waNumber(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 9) return "221" + digits;
  return digits;
}

export function waLink(phone, text = "") {
  const number = waNumber(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${query}`;
}

// ---------- Sheets, dialogs and toasts ----------

const host = () => document.getElementById("app");

/**
 * Opens a bottom sheet. `bind(panel, close)` wires its controls.
 * Returns the close function.
 */
export function openSheet(html, bind = () => {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  const panel = document.createElement("div");
  panel.className = "sheet";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.innerHTML = `<span class="grabber" aria-hidden="true"></span>${html}`;
  host().append(backdrop, panel);
  const previous = document.activeElement;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.classList.remove("open");
    panel.classList.remove("open");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => {
      backdrop.remove();
      panel.remove();
      previous?.focus?.();
    }, 320);
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  bind(panel, close);
  requestAnimationFrame(() => {
    backdrop.classList.add("open");
    panel.classList.add("open");
    (panel.querySelector("[autofocus]") ?? panel.querySelector("input, button"))?.focus({ preventScroll: true });
  });
  haptic("light");
  return close;
}

/** Asks a yes/no question in a sheet. Resolves true when she confirms. */
export function confirmSheet({ title, body, confirm, danger = false }) {
  return new Promise((resolve) => {
    openSheet(
      `<h2 class="sheet-title">${esc(title)}</h2>
       <p class="sheet-body">${esc(body)}</p>
       <div class="sheet-actions">
         <button type="button" class="btn ${danger ? "btn-danger" : ""}" data-yes>${esc(confirm)}</button>
         <button type="button" class="btn btn-plain" data-no>Annuler</button>
       </div>`,
      (panel, close) => {
        panel.querySelector("[data-yes]").addEventListener("click", () => {
          resolve(true);
          close();
        });
        panel.querySelector("[data-no]").addEventListener("click", () => {
          resolve(false);
          close();
        });
      },
    );
  });
}

/** Short message at the bottom of the screen. */
export function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `${icon("check", 18)}<span>${esc(message)}</span>`;
  host().append(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

/** Counts a number up from zero (used once for the stock total). */
export function countUp(el, target, format, duration = 750) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(2, -10 * t);
    el.textContent = format(target * (t === 1 ? 1 : eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
