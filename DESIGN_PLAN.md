# UI Design Plan: Wind Forecast Decision Portal

**Companion to:** `ARCHITECTURE_PLAN.md`, `ARCHITECTURE_REVIEW.md`
**Audience:** coding agents and the human supervisor.
**Chosen Round-1 direction:** **F: Publication Moment** (the "as of" timestamp is the dominant mark), with **A: Cutoff Line** as the chart annotation. Two base colors; semantic colors only where meaning requires them.

> Sourcing note: items marked *(researched)* were checked in this session. Items marked *(general knowledge)* are well-known references that I did not re-verify here. Look at them yourself before copying anything. Take **principles**, never assets, layouts or code from other products.

---

## 1. Design thesis (one paragraph)

This product's whole value is *time honesty*: "this is what you knew at 09:00, and this is how wrong it later proved." So the interface is a **quiet instrument for reading time**. It is typographic first, chart second, decoration never. One abstract idea carries the visual identity: **a wind line crossing a single vertical cutoff**: everything left of the line is *known*, everything right is *forecast*. Calm paper-like surfaces, one ink color, one accent, numbers set in a monospaced face, headlines in a serif. It should feel closer to a well-set financial report or a Swiss poster than to a SaaS dashboard.

## 2. Inspiration board

### 2.1 Principles to adopt *(researched)*
| Source | Principle to take | Where it applies here |
|---|---|---|
| Edward Tufte's design principles | Maximise the data-ink ratio; erase non-data ink and redundant ink; maximise data density; use **small multiples** | Remove heavy gridlines, boxes, legends where direct labels work; use small multiples for per-day or per-horizon comparisons |
| Tufte sparklines | Word-sized, data-intense graphics embedded inline | Inline mini-series in KPI cards and the daily accuracy table |
| Dashboard-design guidance (Stephen Few lineage) | One question per dashboard; supply adequate context for numbers; avoid inaccurate quantitative encoding | Each screen answers a single question; every KPI shows its comparison and sample size |
| Electricity Maps | A public grid-data product that makes complex electricity data readable to a wide audience through colour-coded visual encoding of grid information | Study how it makes grid information legible for non-experts. We take the *clarity*, not the map |

### 2.2 Reference styles to study *(general knowledge: verify by looking)*
| Reference | What to look at |
|---|---|
| **Financial Times / NYT / The Economist graphics** | Direct labelling, annotated peaks, restrained palettes, serif headlines with sans or mono data |
| **Our World in Data** | Honest axes, clear sourcing line under every chart, "how to read this" affordances |
| **Bloomberg-style terminals, calmed down** | Dense tabular numerals, right-aligned figures, timestamp discipline |
| **Linear / Stripe / Vercel dashboards** | Spacing rhythm, subtle borders, keyboard-friendly controls, restrained motion |
| **Observable Plot / D3 gallery** | Minimal marks, small multiples, ridgelines, horizon charts |
| **Swiss / International Typographic Style (Müller-Brockmann)** | Strict grid, asymmetric layouts, large type as the graphic element |
| **Josef Albers / Agnes Martin / Bridget Riley** | Abstraction from lines, grids and tonal steps: a source for the "abstract" layer in §4 |
| **Weather-forecast aesthetics (Windy-style flow fields), muted** | Flow lines as a *background motif* only, never as the main data |

### 2.3 Anti-inspiration (explicitly avoid)
Neon "energy" gradients, lightning-bolt and turbine clip art, glassmorphism everywhere, 3D charts, rainbow colour scales, gauges and speedometers, dense KPI-card walls, emoji icons, red/green-only encodings.

---

## 3. Visual system

### 3.1 Principles
1. **Time is the spine.** Every chart shares the same horizontal time logic; the cutoff is always visible.
2. **Numbers are the headline.** Large tabular numerals, units always attached (MW, MWh).
3. **Two voices.** Serif for statements and titles, mono for data and timestamps.
4. **Colour means something or does not exist.** Base UI is ink-on-paper; colour is reserved for the accent and for the error polarity.
5. **Whitespace is structure.** Spacing and alignment replace borders and boxes.

### 3.2 Design tokens (starting values, tune in review)
Implement as CSS variables on `:root`, mapped into Tailwind and an ECharts theme, so there is one source of truth. Provide light and dark values. **Check every pairing with a contrast checker (WCAG AA minimum) before accepting it. These values have not been tested.**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#F6F4EF` | `#121315` | Page background (warm, not pure white) |
| `--ink` | `#15171A` | `#ECE9E2` | Primary text, data lines |
| `--ink-muted` | `#6B6F76` | `#9A9EA5` | Secondary text, axes |
| `--rule` | `#D9D5CB` | `#2A2C30` | Hairlines, gridlines (very light) |
| `--accent` | `#1F6F8B` (deep teal-blue) | `#5FB3CE` | The forecast line, active state, the cutoff marker |
| `--over` (over-forecast = shortfall risk) | `#C4452D` | `#E5775F` | Error polarity: warm |
| `--under` (under-forecast) | `#2D6A9F` | `#6FA6D6` | Error polarity: cool |

Rules: error colours appear **only** on error views, always paired with a sign or label (never colour-only). Colour-blind safe: warm/cool diverging plus direct text labels.

### 3.3 Typography
- **Display/serif (titles, statements):** a high-quality open serif such as *Newsreader* or *Source Serif 4*. Fallback `Georgia, serif`.
- **Data/mono (numbers, timestamps, axes):** *JetBrains Mono* or *IBM Plex Mono*, with `font-variant-numeric: tabular-nums`. Fallback `ui-monospace, monospace`.
- **UI labels (small, sparingly):** system sans or *Inter*.
- Scale (modular, ~1.25): 12 / 14 / 16 / 20 / 25 / 31 / 39 / 61 px. KPI numerals use the 39–61 px steps.
- Load fonts via Google Fonts (allowed by the hosting CSP) or self-host; always define fallbacks.

### 3.4 Layout, spacing, shape
- 8-px spacing base; a 12-column grid with generous outer margins; content max-width ~1200 px, charts allowed to go wider.
- No card shadows. Separate regions with whitespace and 1-px `--rule` hairlines. Corner radius 0–4 px.
- A single signature element: the **cutoff rule**, a 1-px vertical `--accent` line with a small mono label ("09:00 cutoff · D-1").

### 3.5 Motion
Almost none. Allowed: 150–200 ms fades on data change; the cutoff line drawing in once on first load; the revision lines easing in. Respect `prefers-reduced-motion`.

---

## 4. The "abstract" layer: how beauty emerges from the data

Abstraction comes from **real data rendered with restraint**, not from stock illustration:

1. **Hero: "the wind line."** The landing view's hero is the day's decision forecast drawn as one thin accent line across the full width, with the cutoff rule crossing it. Large serif sentence over it: *"As of 09:00, 14 January, you expected 3.2 GW of wind."*
2. **Vintage stack.** Earlier forecast revisions drawn as faint, thin lines beneath the chosen one (opacity ramps with age). It reads as an abstract sediment of time and also communicates forecast drift.
3. **Half-hour grid.** 48 tiny ticks along the time axis as a quiet rhythm element; it doubles as the chart's baseline grid.
4. **Error as tone, not clutter.** In accuracy views, a diverging warm/cool tonal strip (hour × day heat strip) works as a Riley-like abstract pattern *and* a precise chart.
5. **Optional ambient motif.** A very low-contrast flow-line texture behind the page header, generated from the day's forecast shape (deterministic, static SVG, no animation). Cut this first if time is short.

---

## 5. Screen designs (wireframes)

### 5.1 Decision Brief (`/`): "What do I plan for tomorrow?"

```
┌──────────────────────────────────────────────────────────────┐
│ Wind Forecast · Decision Brief          Delivery  [15 Jan ▾]  │
│                                          Cutoff    [09:00  ▾]  │
├──────────────────────────────────────────────────────────────┤
│ As of 09:00, 14 Jan 2026                       ← serif, large │
│ you expected 3.2 GW of wind on 15 Jan.                        │
│ Forecast published 06:30 · 2h30m before cutoff   ← mono, small│
│                                                              │
│  MW                      │ cutoff                            │
│  ╱╲__╱╲        ·····faint older vintages·····                │
│ ╱      ╲___╱‾‾╲___ ← chosen forecast (accent)                │
│ ····················  ← risk-adjusted (P90) dashed             │
│ |00  04  08  12  16  20  24|  (48 ticks)                     │
│                                                              │
│ Total   Peak     Min      Risk margin (P90)                  │
│ 76 GWh  4.1 GW   1.9 GW   −0.6 GW   ← mono numerals, sparkline│
│ [ ] show earlier forecasts   [ ] show actuals (past days)    │
└──────────────────────────────────────────────────────────────┘
```
Rules: the sentence at the top is generated from data (single source of truth: the API's `publish_time` and `cutoff_utc`). The "in-sample" badge appears when the risk band uses pooled data (see review §1.4). Missing periods are shown as visible gaps, never interpolated.

### 5.2 Accuracy (`/accuracy`): "How wrong are the forecasts?"
- Header: date range and cutoff control; a single serif sentence summarising the result ("Over the month, the forecast ran 210 MW high on average; 1 in 20 half-hours was off by more than 1.8 GW"), filled from data.
- Row of 4–5 KPIs as large mono numerals with sparklines: Bias, MAE, RMSE, nMAE, P95 over-forecast. Each shows `n` and a confidence range.
- **Small multiples:** one tiny error chart per delivery day (grid of ~31), same axes, so patterns jump out.
- Error histogram with P90/P95 marks (diverging tone).
- Error by lead time (horizon) as a step line; by hour as a tonal strip.
- Under every chart: one-line source and as-of footnote.

### 5.3 Method & Data (`/method`): "Why should I trust this?"
Mostly typography: serif prose, a definition list of assumptions (A1–A6 plus review additions), sign convention shown with a tiny diagram, data lineage from `/meta` (fetch time, licence attribution), and an honest "limitations" section. This is where the product's *defensibility* promise is delivered.

---

## 6. Component inventory (build once, reuse)

| Component | Notes |
|---|---|
| `AppShell` | Slim top bar, no sidebar; three text links |
| `AsOfStatement` | Serif sentence plus mono publish-time line; takes API fields only |
| `TimeChart` | ECharts wrapper: shared x-axis logic, cutoff rule, vintage layers, gap handling, direct labels |
| `CutoffRule` | The signature element, reusable in all time charts |
| `KpiNumeral` | Big tabular number, unit, label, optional sparkline and `n` |
| `Sparkline` | Tiny inline SVG/ECharts series |
| `SmallMultiples` | Responsive grid of mini charts with shared scale |
| `ErrorStrip` | Diverging tonal heat strip (hour × day) |
| `Tooltip` | Mono, minimal, shows value, unit, time, and as-of |
| `StateViews` | Skeleton, empty, error (calm copy; no cartoon illustrations) |
| `ThemeToggle` | Light and dark via the token layer |

ECharts theme file holds all chart styling (no per-chart overrides): thin lines (1–1.5 px), no gridlines except faint horizontals, no legends when direct labels fit, axis labels in mono.

---

## 7. Accessibility and responsiveness
- Contrast: all text and chart marks meet WCAG AA, verified with a tool (not assumed).
- Never colour alone: error polarity is also labelled "over"/"under" and signed (+/−).
- Keyboard: all controls reachable; visible focus ring in `--accent`.
- Charts: provide an `aria-label` summary and a "view as table" toggle for the main series.
- Responsive: target laptop first (≥1024 px), degrade to tablet. The hero sentence and KPIs stack on narrow screens; small multiples reduce columns. Phone polish is a stretch goal.
- Units on every number; tooltips explain MAE, RMSE, nMAE in plain English.

---

## 8. Build plan (design work packages)

Slots into the architecture plan's frontend work packages (WP5–WP8). Keep the design stream small, because the whole project has a 16-hour cap.

| WP | Task | Output | Acceptance |
|---|---|---|---|
| **D1** | Tokens and theme | `tokens.css`, Tailwind mapping, ECharts theme, font loading | Light/dark both render; contrast verified; one file drives chart and UI colours |
| **D2** | Core components | `AppShell`, `KpiNumeral`, `AsOfStatement`, `CutoffRule`, `StateViews` | Storybook-lite page (or a `/dev/components` route) showing each in all states |
| **D3** | Chart kit | `TimeChart`, `Sparkline`, `ErrorStrip`, `SmallMultiples` | Renders fixture data; gaps handled; cutoff rule and vintages work |
| **D4** | Decision Brief screen | §5.1 | Matches wireframe; the as-of sentence is data-driven; reads well at 1280 px |
| **D5** | Accuracy and Method screens | §5.2, §5.3 | Charts annotated with source/as-of; "view as table" works |
| **D6** | Polish pass | Spacing audit, reduced-motion, a11y check, screenshots for README and video | Passes the checklist in §9 |

Sequence: D1 → D2 → D3 → (D4 ∥ D5) → D6. Build against fixture JSON first so design is not blocked by the API.

### Tooling suggestions
- Design in code directly (Tailwind + tokens); skip a separate design-tool phase to save time, or use a quick low-fi sketch only.
- Review visually with real data screenshots at each work package, not just component demos.
- Use the `frontend-design` guidance available to agents to avoid generic templated looks.

---

## 9. Design acceptance checklist
- [ ] A stranger can say what the screen is for within 5 seconds (one question per screen).
- [ ] The "as of" time is the first thing read on the Decision Brief.
- [ ] The cutoff rule appears on every time-based chart.
- [ ] No more than two base colours plus the error pair; no rainbow scales.
- [ ] No gridline, border or legend that is not earning its ink.
- [ ] Every number has a unit; every chart has a source/as-of footnote.
- [ ] Gaps in data are visible, not hidden or interpolated.
- [ ] Passes contrast checks and works without relying on colour.
- [ ] Looks deliberate and calm in both light and dark.
- [ ] Screenshots for the video are produced from the deployed app with real January data.

---

## 10. Risks and trade-offs
| Risk | Mitigation |
|---|---|
| "Beautiful and abstract" eats the schedule | Hero, vintages, tonal strip are all *real charts*; skip the ambient motif and the dark theme first |
| Serif + mono looks precious or inconsistent | Limit to two families plus system sans for tiny labels; review on real data early |
| Minimal design hides needed information | Keep tooltips, "view as table", and the Method page as the escape hatches |
| Chart library fights the style | Centralise in one ECharts theme; if it fights too much, drop to hand-built SVG for the hero only |
| Token values look wrong in practice | Treat §3.2 as a starting point and tune from screenshots |
