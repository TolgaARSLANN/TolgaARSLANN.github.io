# tolgaarslann.github.io

Personal portfolio of **Tolga Arslan**, Full-Stack Developer (React · Node.js · Express · Python · FastAPI).

Live: https://tolgaarslann.github.io/

- Plain HTML, CSS and JavaScript, no build step; served by GitHub Pages from `main`.
- English / Turkish toggle (`?lang=tr` or `?lang=en` also works); English text lives in `index.html`, Turkish strings in `assets/js/i18n.js`.
- Dark theme by default with a light theme toggle; command palette on Ctrl+K (or /).
- CVs: `assets/cv/`.

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Social preview image

`assets/og-image.png` (1200×630) is rendered from `tools/og-image.html` with headless Chrome:

```bash
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot=assets/og-image.png tools/og-image.html
```

## Cache busting

GitHub Pages caches files for 10 minutes. After changing CSS or JS, bump the `?v=` value on the three asset links in `index.html` so returning visitors never mix new HTML with old scripts.
