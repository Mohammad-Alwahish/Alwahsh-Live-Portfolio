# ALWAHSH — Directed Live-Build Portfolio

This update keeps the existing design, enlarged soft-edge circular portrait,
Dark/Light Mode, projects, responsive layout, and auto-scrolling build experience.

## What changed

- Replaced all random cursor wandering with **deterministic, role-based choreography**.
- Each editor has a real job: Layout, Typography, Media, Components, Spacing, Design, Polish, or Motion.
- Cursors work on the precise DOM elements being constructed, then return to quiet stations.
- A second editor joins only to size an image or polish a large heading.
- Motion guides the viewer during automatic section scrolling, instead of jumping around randomly.
- Pause also freezes cursor animations and auto-scroll until resumed.
- The circular portrait and its soft fade remain unchanged.

## Install into your current project

Replace **script.js** and **style.css** with the files in this package. Keep
`index.html`, `assets/`, and your personal photo `assets/me.jpg` from your
working version. If you use the full ZIP package, copy your own `me.jpg` into
its `assets` folder first.

Open `index.html` via Live Server. The automatic build begins immediately, lasts roughly one minute, and can be repeated with **REPLAY THE BUILD**.

Note: `?speed=0.15` in the URL accelerates a demo, and `?instant=1` shows the
finished site for screenshots. Neither query is needed for ordinary use.
