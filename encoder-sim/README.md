# encoder-sim — Magnetic Rotary Position Sensors · Interactive Engineering Lab

A zero-dependency, offline-capable educational web app covering the three most
used magnetic rotary position sensors for motor-control / speed-measurement
applications:

| Device | Vendor | Doc | Outputs |
|---|---|---|---|
| **HAL 3020 / HAL 3021** ("HAL 302x") | TDK-Micronas | DSH000237_002EN (Jul 2025) | Ratiometric analog SIN±/COS± (10–90 %VSUP), FuSa diagnostics, EEPROM |
| **AS5147** | ams | DS000307 v2-00 | 14-bit digital angle over SPI, ANGLECOM, ABI (2048/1024), UVW 1–7 poles, PWM |
| **AS5116** | ams | DS000686 v2-00 | Differential analog SIN±/COS± (DMOD-cleaned), UART/DIAG pin, ECC-protected OTP |

> **Unofficial educational tool.** Not affiliated with TDK-Micronas or ams-OSRAM.
> Figures are reproduced from the datasheets for interoperability discussion;
> always design to the official documents.

## Run it

No build, no npm, no server required. Open `index.html` in any modern browser
(Chrome/Firefox/Edge/Safari, desktop or mobile) — it runs fully from `file://`.

Optional local server:

```bash
python3 -m http.server 8137   # then http://127.0.0.1:8137
```

## What's inside

12 sections × 4 device tabs (HAL 302x · AS5147 · AS5116 · Compare) × 2 modes:

* **Watch** — auto-playing narrated spec cards (6.5 s/card, dots, prev/next, progress, pause).
* **Play** — hands-on sandboxes: canvas magnet-physics rotor sim, oscilloscope with live traces,
  SPI frame builder with parity checker & waveform painter, hamming-SEC ECC bit-flipper,
  Hamming/GLOAD OTP burn exercisers, race-condition simulator for torn reads, RTL pipeline
  stepper (CORDIC → DAEC → ANGLECOM), safe-state explorer, stress explorer (abs-max vs recommended).

Sections: motor context → pinouts (interactive SVG, click-a-pin) → abs-max/electrical →
functional blocks (real datasheet figures + hotspot overlays) → hall-array geometry →
outputs (analog/ABI/PWM) → gain & bandwidth → interfaces → DSP/RTL & latency →
diagnostics & safe states → OTP/EEPROM → **Master Compare** (full verified matrix + application recommender).

Every section carries reference chips pointing at the exact datasheet chapter it derives from.

## File map

```
index.html                 entry (classic <script> tags — no modules, works from file://)
css/tokens.css             design tokens: #0E1116 dark theme, IC accent colours
css/layout.css             sidebar + main grid, toolbar, panels
css/components.css         watch player, tables, gauges, pinouts, hotspots, sims, code viewer
css/responsive.css         ≤1080 px (tablet) and ≤860 px (mobile portrait) breakpoints
js/main.js                 nav, hash routing (#sec-…), tab/mode state machine, ←/→ keyboard nav
js/data/*.js               ENC_DATA.* — single source of truth for every spec value (see below)
js/ui/tabs.js              ENC_UI — el/h, watchPlayer, hotspotStage, pinout(SVG), widgets
js/ui/matrix.js            ENC_UI.matrix — master compare table (filter, diff highlight)
js/ui/code-viewer.js       ENC_UI.codeViewer — line-numbered Verilog/C highlighter
js/sims/magnet-physics.js  rotor/gap/eccentricity field sandbox (canvas)
js/sims/oscilloscope.js    grid scope, sweep cursor, freeze (canvas)
js/sims/rtl-stepper.js     SAMPLE→CORDIC→DAEC→LATCH→OUTPUT stepper + register file
js/sims/race-sim.js        torn-read race simulator (ANGLE vs ANGLECOM)
js/sections/01…12          one file per section; each pushes a section definition
assets/images/{packages,blocks,datasheet-figs}/*.png   figures extracted from the PDFs
svg/{field-lines,vector-math}.svg                      vector diagrams (Section 5/9)
```

## Deviations from the original spec

1. **Data files are `.js`, not `.json`.** `file://` blocks `fetch()` of local JSON in every
   current browser; classic scripts assigning `window.ENC_DATA.*` are the robust zero-setup path.
   They contain the same content the `.json` files would have.
2. **Watch mode = text cards** (no audio), per the “narrated spec cards” decision.
3. System font stacks stand in for Inter/Fira Code (no external downloads; the look is identical offline).

## Verification methodology

Every electrical value in the app was extracted from the three attached PDFs and
machine-checked (PyMuPDF text extraction + targeted greps; figures re-rendered from the
vector drawings at ~2.6× and auto-cropped). Where a datasheet and common shorthand
disagree, the app flags the mismatch (Section 12 → “Verification notice”) instead of
silently picking one:

* **“150 mW”** — that is the **AS5147** Pt abs-max. HAL 302x publishes typical self-heat
  53 mW (3020) / 65 mW (3021); AS5116 is bounded by IDD ≤ 17 mA.
* **“≤ 0.06° stray-field drift”** — **HAL 3021 only**. HAL 3020 is ≤ 0.10° (ΔEθ).
* **“IDD 10.5–17 mA”** — mixes three specs: HAL 3020 (10.5 typ / 12 max), HAL 3021
  (13 / 15), AS5147 (≤ 15), AS5116 (≤ 17).
* **“60 000 rpm”** — HAL 302x only, bandwidth-limited. AS5116 is ±30 000 rpm;
  AS5147 is specified at 14 500 rpm via DAEmax, no single max-rpm line.
* **“Analog outputs”** — does not describe AS5147 (digital ANGLECOM/ABI/UVW/PWM).
* **HAL tDelay** — Table 5-3 columns are min/typ/max @ 500 Hz, one row per bw_filt:
  00 → 4.16/4.59/4.90 µs (70.5 kHz) · 01 → 6.20/6.98/7.51 µs (32.1 kHz) ·
  10 → 9.02/10.16/10.93 µs (16.1 kHz, default) · 11 → 37.55/40.40/42.69 µs (4.6 kHz); jitter max 2 ns.

## Credits / sources

TDK-Micronas **DSH000237_002EN** (HAL 302x, Jul 2025) · ams **DS000307 v2-00** (AS5147) ·
ams **DS000686 v2-00** (AS5116). All register names, addresses, timings and limits are
quoted from those documents; the RTL in Section 09 is an *illustrative teaching model*,
not vendor RTL.

## Deploy to GitHub (3 steps)

The folder is a plain static site — no build step, no server-side code.

```bash
git init && git add . && git commit -m "encoder-sim lab"
gh repo create encoder-sim --public --source=. --push   # or push to your existing remote
```

Then: GitHub → repo **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
Your site goes live at `https://<user>.github.io/encoder-sim/` within a minute.
(Also works as-is on Netlify/Vercel — just drag the folder in.)

## Editing parameters later

All numbers live in one place per device — you never touch section code:

* `js/data/hal302x.js`, `js/data/as5147.js`, `js/data/as5116.js` — specs, registers, pinouts,
  block-diagram hotspot coordinates (percent of figure), narration bullets.
* `js/data/compare.js` — the master matrix rows (`diff: true` marks a differentiating row).
* Section prose/narration: `js/sections/0N-*.js` → `tabs.<device>.watch[]` cards.
* Rename a value once, it propagates everywhere it is referenced from those files.

Sanity check after any edit: open `index.html` (or `python3 -m http.server`) and
`node --check` any changed JS file.
