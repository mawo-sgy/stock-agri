// Small drawn illustrations for empty states, in the app's own palette and line weight.

const G = "#1D5B45";
const T = "#E7F1EC";
const S = "#CDE3D8";

/** Stacked sacks on a pallet: no stock yet. */
export const sacks = `
<svg class="illus" width="148" height="112" viewBox="0 0 148 112" aria-hidden="true">
  <ellipse cx="74" cy="100" rx="56" ry="7" fill="${T}"/>
  <rect x="26" y="84" width="96" height="10" rx="3" fill="${S}"/>
  <g stroke="${G}" stroke-width="2" stroke-linejoin="round">
    <path d="M32 84c-2-14 2-24 10-28h20c8 4 12 14 10 28z" fill="#fff"/>
    <path d="M74 84c-2-14 2-24 10-28h20c8 4 12 14 10 28z" fill="#fff"/>
    <path d="M53 56c-2-14 2-24 10-28h20c8 4 12 14 10 28z" fill="${T}"/>
  </g>
  <g stroke="${G}" stroke-width="2" stroke-linecap="round">
    <path d="M44 56h16M86 56h16M65 28h16"/>
  </g>
  <circle cx="118" cy="22" r="10" fill="${T}"/>
  <path d="M114 22h8M118 18v8" stroke="${G}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** Two chat bubbles: no buyers yet. */
export const people = `
<svg class="illus" width="148" height="112" viewBox="0 0 148 112" aria-hidden="true">
  <ellipse cx="74" cy="100" rx="52" ry="7" fill="${T}"/>
  <g stroke="${G}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="54" cy="44" r="13" fill="#fff"/>
    <path d="M30 92c0-15 11-26 24-26s24 11 24 26z" fill="#fff"/>
    <path d="M84 20h40a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-22l-10 9v-9h-8a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="${T}"/>
    <path d="M94 33h28M94 41h18"/>
  </g>
</svg>`;

/** An open notebook: nothing in the journal yet. */
export const notebook = `
<svg class="illus" width="148" height="112" viewBox="0 0 148 112" aria-hidden="true">
  <ellipse cx="74" cy="100" rx="54" ry="7" fill="${T}"/>
  <g stroke="${G}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M24 26c18-6 34-6 50 4v62c-16-10-32-10-50-4z" fill="#fff"/>
    <path d="M124 26c-18-6-34-6-50 4v62c16-10 32-10 50-4z" fill="${T}"/>
    <path d="M36 42c9-3 18-3 26 1M36 54c9-3 18-3 26 1M36 66c9-3 18-3 26 1"/>
    <path d="M86 43c8-4 17-4 26-1"/>
  </g>
</svg>`;

/** A magnifier: nothing matches the search. */
export const search = `
<svg class="illus" width="148" height="112" viewBox="0 0 148 112" aria-hidden="true">
  <ellipse cx="74" cy="100" rx="44" ry="7" fill="${T}"/>
  <g stroke="${G}" stroke-width="2" stroke-linecap="round">
    <circle cx="66" cy="50" r="26" fill="#fff"/>
    <circle cx="66" cy="50" r="18" fill="${T}"/>
    <path d="M85 69l20 20" stroke-width="6"/>
  </g>
</svg>`;

/** Empty state block: illustration, a heading, a line, and an optional action. */
export function emptyState({ art, title, text, action = "" }) {
  return `<div class="empty">${art}<h2 class="empty-title">${title}</h2><p class="empty-text">${text}</p>${action}</div>`;
}
