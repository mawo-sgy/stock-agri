# Stock — gestion agricole

An installable web app (PWA) for tracking truckloads of ginger, hibiscus, millet, maize and sorghum: stock by lot, buyers, sales, payments and a journal. It is in French, works offline, and has no build step.

Live: https://mawo-sgy.github.io/stock-agri/

## Run it on your computer

From this folder:

```bash
python -m http.server 8770
```

Then open http://localhost:8770 and pick a phone size in the browser's device toolbar (F12).

## Run the tests

From this folder:

```bash
node --test tests/model.test.mjs
```

## Put it on her phone

A phone can only install the app from an **https** address. GitHub Pages serves this repository at the live address above and republishes it a minute after every push to `main`.

On Android, open the address in Chrome and choose "Ajouter à l'écran d'accueil". On iPhone, use Safari, then Share → "Sur l'écran d'accueil".

After changing any file, bump `VERSION` in `sw.js` (for example `stock-v2`) so installed phones pick up the new version on their next launch.

## Where the data lives

Everything is saved on the phone (localStorage). Réglages → "Exporter une sauvegarde" makes a JSON file she can keep on WhatsApp or Google Drive, and "Restaurer une sauvegarde" reads it back. Clearing the browser's data erases the stock, so export a backup regularly.

All reads and writes go through `js/store.js`. Moving to Supabase later means rewriting that one file; the screens do not change.

## Files

| Path | What it holds |
| --- | --- |
| `js/model.js` | Pure calculations: stock, lot ages, what each buyer owes, the journal |
| `js/store.js` | Saving and loading, every change to the data, backups |
| `js/format.js` | French numbers, money and dates |
| `js/ui.js` | Icons, haptics, sheets, toasts, shared pieces |
| `js/views/*.js` | One file per screen |
| `js/seed.js` | The invented sample data behind "Essayer avec des exemples" |
| `css/app.css` | The whole design system |

Vibrations work on Android only; iPhones ignore web vibration.
