# captina.dev

Static site for CAPTINA, served by GitHub Pages (`CNAME`). No build step, no external requests.

- `index.html`: page content, in English (default language).
- `translations/lang-fr.json`: French strings, keyed by the `data-i18n` / `data-i18n-attr` attributes of `index.html`.
  Every key used in the HTML must exist here; a missing key falls back to English.
- `css/style.css`, `js/main.js`: styles and behaviour (language switch, menu, reveal on scroll).
- `fonts/`: self-hosted Chakra Petch and IBM Plex (SIL Open Font License).

Preview locally with `python3 -m http.server` (the French file is fetched, so `file://` won't load it).
