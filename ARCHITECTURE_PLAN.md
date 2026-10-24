# Wind Forecast Decision Portal: Architecture & Build Plan

**Audience:** coding agents (and the human reviewer who supervises them).
**Source:** `REint_Full_Stack_SWE_challenge_v4_Shared.docx`
**Hard constraints from the brief:** React frontend, Python backend, Docker, deployed on Vercel *or* Heroku, only Elexon `FUELHH` (WIND) + `WINDFOR` data, decisions made in **January 2026**, ≤16 h effort, README must disclose AI tool use, public repo with anonymous name, ≤10 min demo video (5 min customer pitch + 5 min tech review).

---

## 1. Problem restated in engineering terms

A UK utility buys day-ahead power. Residual demand to procure = demand − wind (− other renewables). Wind is forecast, and the buy decision is made on D-1, so the user needs two things:

| # | User need | What the system must compute |
|---|-----------|------------------------------|
| N1 | "What is the latest wind forecast available at the moment I must decide?" | For each target half-hour on delivery day D, the forecast with the **latest `publishTime` ≤ decision cutoff on D-1**. |
| N2 | "How wrong are these forecasts, quantitatively?" | Error = forecast − actual, joined on `startTime`. Metrics (MAE, RMSE, bias, percentiles, etc.), sliced by horizon, hour of day, wind level, and day. |

The central domain subtlety, and the thing the app is really judged on, is the **"as-of" (point-in-time) join**. WINDFOR holds many forecast *vintages* per target time. Naively taking the latest vintage, or averaging them, leaks information that the trader did not have. Everything in the design protects this correctness.

### 1.1 Assumptions to state explicitly (README + video)

| ID | Assumption | Default | Configurable |
|----|-----------|---------|--------------|
| A1 | Decision cutoff on D-1 (gate closure proxy) | **09:00 Europe/London** (the real UK day-ahead auction gates close mid-morning; confirm with PM) | yes: `cutoff_hour` / `cutoff_minute` |
| A2 | "Decisions made in January 2026" means decision days D-1 ∈ [1 Jan, 31 Jan 2026], so delivery days D ∈ [2 Jan, 1 Feb 2026] | as stated | yes, via date range |
| A3 | Timezone | Store everything in **UTC**. January is GMT, so UTC = London time, but code must still use `Europe/London` conversions (no hardcoded offsets) | n/a |
| A4 | Forecasts with `publishTime ≥ startTime` are not forecasts and are excluded | exclude | no |
| A5 | Actuals = `FUELHH` rows with `fuelType == "WIND"`; MW per half-hour | as stated | no |
| A6 | Data is metered transmission-level wind (likely excludes embedded wind). Flag as a caveat in the pitch; do not over-claim | caveat only | n/a |

> **Verify before coding (Phase 0):** exact query-parameter names for the two `/stream` endpoints (expected: `publishDateTimeFrom/To` for WINDFOR; `settlementDateFrom/To` + `fuelType` for FUELHH), pagination or size limits, and the date-range window limits per request. Base URL is expected to be `https://data.elexon.co.uk/bmrs/api/v1/datasets/{DATASET}/stream`, and the API needs no key. Do this with a throwaway probe script and record the findings in `docs/data-notes.md`. Do not trust this plan's parameter names over the live response.

---

## 2. Key architectural decision: snapshot-first, stateless serving

The scope is tiny and bounded: ~31–32 days × 48 half-hours ≈ 1.5k actual rows, and WINDFOR with many vintages (order of 10⁴–10⁵ rows). Therefore:

- **Ingestion is an offline, repeatable CLI job**, not a request-time dependency. It pulls from Elexon, validates, and writes a versioned **Parquet snapshot** (`backend/data/snapshot/*.parquet` plus `manifest.json` with fetch time, row counts, and checksums), committed to the repo.
- **The API is stateless and read-only**: it loads the snapshot into memory at cold start and computes analytics on request using pandas.
- **No database server.** This removes infra, makes Vercel serverless viable, makes the demo deterministic (Elexon being down during the pitch cannot hurt), and makes tests hermetic.
- A **live-refresh path** still exists (`python -m ingest refresh`) and is shown in the tech review as the production extension point (scheduled job → object storage or Postgres).

```
 Elexon Insights API (open, no key)
        │  (httpx, retries, chunked by day)
        ▼
 ┌───────────────┐   validate (pandera)   ┌──────────────────────────────┐
 │ ingest CLI    │ ─────────────────────► │ Parquet snapshot + manifest  │ (committed)
 └───────────────┘                        └──────────────┬───────────────┘
                                                         │ load at cold start
                                          ┌──────────────▼───────────────┐
                                          │ FastAPI app                  │
                                          │  domain/  (pure functions)   │
                                          │  api/     (routers, schemas) │
                                          └──────────────┬───────────────┘
                                                         │ JSON (OpenAPI contract)
                                          ┌──────────────▼───────────────┐
                                          │ React SPA (Vite, TS)         │
                                          └──────────────────────────────┘
```

---

## 3. Technology choices (with rationale)

### 3.1 Backend (Python 3.12)

| Concern | Choice | Why |
|---|---|---|
| Web framework | **FastAPI** + Pydantic v2 | Auto OpenAPI → typed frontend client; runs on Vercel's Python runtime and in Docker. |
| ASGI server | **uvicorn** (Docker/local) | Standard. |
| HTTP client (ingest) | **httpx** + **tenacity** retries | Sync is fine for a CLI. |
| Data | **pandas** + **pyarrow** (Parquet) | Time-indexed joins and `merge_asof` map directly to the problem. *Risk:* Vercel's function size limit (250 MB unzipped). If exceeded, fall back to **polars** (much smaller) behind the same `domain/` interface. |
| Validation | **pandera** (DataFrame schemas) at ingest and at load | Catches duplicates, nulls, non-30-min grids, negative MW. |
| Config | **pydantic-settings** | Cutoff, timezone, snapshot path, via env vars. |
| Tooling | **uv** (deps), **ruff** (lint+format), **mypy --strict** on `domain/`, **pytest** + **hypothesis** (property tests on the as-of join) | Fast, reproducible. |

### 3.2 Frontend (React 18 + TypeScript)

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite** | Fast, static output suits Vercel. |
| Server state | **TanStack Query** | Caching, loading and error states with little code. |
| Routing | **React Router** (3–4 routes) | Simple. |
| Charts | **Apache ECharts** (`echarts-for-react`, tree-shaken) | Time-axis zoom/brush, confidence bands, histograms, heatmaps in one lib; handles the point counts easily. |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) | Polished look quickly; matters for the "impress the client" goal. |
| API types | **openapi-typescript** generating from the backend's `openapi.json` | Single source of truth; agents cannot drift the contract. |
| Quality | **ESLint**, **Prettier**, **Vitest** + Testing Library, **Playwright** (one smoke test) | Proportionate. |

### 3.3 Containers, CI, deployment

- **Docker:** `backend/Dockerfile` (multi-stage, slim, non-root), `frontend/Dockerfile` (build → nginx), `docker-compose.yml` (one-command local run: `docker compose up`). nginx proxies `/api` → backend.
- **Deployment target: Vercel (primary).** One Vercel project: Vite static build + FastAPI as a Python serverless function mounted at `/api/*` (`api/index.py` exporting the ASGI `app`; `vercel.json` rewrites). The snapshot ships inside the function bundle (`includeFiles`).
- **Honest trade-off:** Vercel does not run Docker images, so Docker serves local/dev parity, CI, and reviewer reproducibility, and the Dockerfiles are also the **Heroku container (`heroku.yml`) fallback** if the function bundle limit bites. Say this plainly in the README and the tech-review video so the "uses Docker" requirement is shown as genuinely met rather than box-ticked.
- **CI (GitHub Actions):** ruff, mypy, pytest, frontend lint/test/build, `docker compose build`. A drift check regenerates the OpenAPI types and fails if the working tree is dirty.

---

## 4. Domain logic (the core, pure and heavily tested)

Location: `backend/app/domain/`. No FastAPI or IO imports in this package.

### 4.1 `asof.py`: point-in-time forecast selection (N1)

```
select_decision_forecast(forecasts_df, delivery_date, cutoff) -> DataFrame
  cutoff_utc = (delivery_date - 1 day) at cutoff time in Europe/London → UTC
  keep rows where startTime on delivery_date (London local day) AND publishTime <= cutoff_utc AND publishTime < startTime
  per startTime, take row with max(publishTime)
  add horizon_h = (startTime - publishTime) in hours
```

Required properties (hypothesis tests):
1. Never returns a row with `publishTime > cutoff`.
2. Result has ≤ 1 row per `startTime`.
3. Adding a forecast published *after* the cutoff never changes the output.
4. Adding a *later-but-before-cutoff* forecast changes the output to that forecast.
5. Handles targets with no eligible forecast (return a gap, never silently fill).

### 4.2 `errors.py`: join and error definition (N2)

- Join the decision forecast to actuals on `startTime` (left join from forecast; actual may be null → flagged `missing_actual`).
- `error_mw = forecast_mw − actual_mw`. **Sign convention is fixed and documented:** positive = over-forecast = **shortfall risk for the buyer**, since wind came in lower than expected and they under-bought. This framing is the commercial insight for the pitch.

### 4.3 `metrics.py`

Compute on aligned pairs only, and always return `n` (count) alongside:

| Metric | Notes |
|---|---|
| Bias (ME) | mean(error) |
| MAE, RMSE | MW |
| nMAE | MAE / mean(actual) (avoids dividing by near-zero actuals the way MAPE does; **do not headline MAPE**, and document why) |
| Error percentiles | P5, P50, P90, P95, P99 of signed error and of absolute error |
| Over-forecast share | % of periods with error > 0 |
| Tail-risk metric | Expected shortfall or P95 over-forecast in MW, which is the number a buyer actually cares about |
| (Stretch) skill vs persistence | persistence = actual 24 h earlier (still within the allowed data) |

### 4.4 `slices.py`: accuracy breakdowns

- **By horizon** (use *all* vintages, not just the decision one): buckets e.g. 0–6 h, 6–12, 12–24, 24–36, 36–48, 48+. Shows how accuracy decays and *why the cutoff choice matters*.
- **By hour of day** (London local).
- **By actual wind level** (terciles or bins): errors usually scale with output.
- **By delivery day** (daily MAE/bias time series).
- **Error distribution:** histogram bins + quantiles.

### 4.5 `risk.py`: uncertainty band for a selected delivery day

Turns N2 into a decision aid: `risk_adjusted_wind = forecast − q_over` where `q_over` is the empirical P-quantile of over-forecast error (default P90; user-selectable).

**Leakage rule (must be implemented and called out in the video):** when displaying a band for day D, estimate the quantiles **only from delivery days < D** (expanding window). For the first days with fewer than a minimum sample (e.g. <3 days), fall back to the pooled January distribution and **show a visible "in-sample" badge**. Never silently use the future.

---

## 5. API contract (contract-first; agents implement against this)

Base path `/api`. All timestamps ISO-8601 UTC with `Z`. All MW as floats. Every response includes `meta.snapshot_id`.

| Method & path | Query params | Returns |
|---|---|---|
| `GET /health` | n/a | `{status, snapshot_id}` |
| `GET /meta` | n/a | coverage (min/max delivery date), defaults (cutoff, tz), snapshot manifest (fetched_at, row counts), data-source URLs, assumption list |
| `GET /decision-forecast` | `delivery_date`, `cutoff_hour?`, `cutoff_minute?` | `{cutoff_utc, points:[{start_time, forecast_mw, publish_time, horizon_h, actual_mw\|null}], summary:{forecast_total_mwh, forecast_min/max/mean_mw, forecast_publish_range, missing_periods}}` |
| `GET /forecast-revisions` | `delivery_date`, `max_vintages?` | vintage series for a "how the forecast changed" overlay, with `publish_time` per vintage and a flag marking the one eligible at the cutoff |
| `GET /accuracy/summary` | `from`, `to`, `cutoff_hour?` | metrics from §4.3 on decision forecasts over the range |
| `GET /accuracy/by-horizon` | `from`, `to` | metrics per horizon bucket (all vintages) |
| `GET /accuracy/by-hour` | `from`, `to`, `cutoff_hour?` | metrics per local hour of day |
| `GET /accuracy/by-wind-level` | `from`, `to`, `cutoff_hour?` | metrics per wind-level bin |
| `GET /accuracy/daily` | `from`, `to`, `cutoff_hour?` | one metrics row per delivery day |
| `GET /accuracy/error-distribution` | `from`, `to`, `cutoff_hour?`, `bins?` | histogram + quantiles |
| `GET /risk-band` | `delivery_date`, `quantile?` (default 0.9), `cutoff_hour?` | per-period `{start_time, forecast_mw, risk_adjusted_mw}` + `{estimation_window, in_sample: bool}` |

Rules: validation errors → 422 (FastAPI default); out-of-coverage dates → 404 with a clear message; never 500 on missing data (return gaps + counts).

---

## 6. Frontend: screens and UX intent

Design brief: serious, trustworthy, trader-friendly (dark or light toggle optional), numbers first and charts second, **every chart annotated with the as-of time**.

| Route | Purpose | Contents |
|---|---|---|
| `/` **Decision Brief** | N1 | Delivery-day picker, cutoff control (default 09:00 London) · KPI strip (total expected wind MWh, peak/min MW, forecast published-at timestamp, data-freshness badge) · main chart: decision forecast + risk-adjusted line/band, with actuals overlaid when the day is historical · toggle "show earlier vintages" (revisions) · plain-language callout: *"At 09:00 on 14 Jan you would have used the forecast published at HH:MM; it later moved by X MW."* |
| `/accuracy` **Forecast Accuracy** | N2 | Date-range filter · KPI cards (Bias, MAE, RMSE, nMAE, P95 over-forecast) · daily error series · error histogram with P90/P95 markers · by-horizon chart · by-hour heatmap/bars · by-wind-level chart |
| `/method` **Method & Data** | Trust and handover | Plain-English methodology, sign convention, assumptions A1–A6, data lineage (`/meta`), caveats |

UX requirements: skeleton loaders, error and empty states, responsive down to a laptop viewport, accessible color palette and chart labels, units on every number (MW/MWh), and no unexplained jargon (tooltips for MAE/RMSE/nMAE).

---

## 7. Repository layout

```
<anonymous-repo-name>/
├─ README.md                  # files/dirs, how to run, Vercel link, AI-tools disclosure
├─ docker-compose.yml
├─ vercel.json
├─ heroku.yml                 # fallback
├─ api/index.py               # Vercel entrypoint → backend.app.main:app
├─ backend/
│  ├─ Dockerfile
│  ├─ pyproject.toml          # uv
│  ├─ app/
│  │  ├─ main.py              # app factory, CORS, snapshot loading (lifespan)
│  │  ├─ config.py
│  │  ├─ api/                 # routers + pydantic schemas ONLY
│  │  ├─ domain/              # asof.py errors.py metrics.py slices.py risk.py (pure)
│  │  └─ data/                # loader.py, schemas.py (pandera)
│  ├─ ingest/                 # CLI: fetch, validate, write snapshot
│  ├─ data/snapshot/          # *.parquet + manifest.json (committed)
│  └─ tests/                  # unit, property, API, contract tests + tiny fixtures
├─ frontend/
│  ├─ Dockerfile, nginx.conf
│  ├─ src/{api/(generated client), components/, features/{brief,accuracy,method}/, lib/}
│  └─ tests/
├─ docs/
│  ├─ data-notes.md           # live API findings (Phase 0)
│  ├─ decisions.md            # short ADR-style log (§2, §3.3, assumptions)
│  └─ demo-script.md          # video storyline (§10)
└─ .github/workflows/ci.yml
```

---

## 8. Work packages for coding agents

Sequenced so independent packages can run in parallel after WP1. Each has an objective, acceptance criteria, and its file ownership, so agents do not collide.

| WP | Title | Depends on | Owns | Acceptance criteria |
|----|-------|-----------|------|---------------------|
| **WP0** | API probe and data notes | n/a | `docs/data-notes.md`, throwaway script | Confirmed param names, row counts, field types, duplicate/missing behavior for Jan 2026 for both datasets; sample payloads saved as test fixtures |
| **WP1** | Scaffolding, tooling, CI, Docker skeleton | WP0 | repo root, CI, Dockerfiles | `docker compose up` serves a hello endpoint and a blank SPA; CI green |
| **WP2** | Ingestion CLI and snapshot | WP1 | `backend/ingest/`, `data/` | `python -m ingest refresh --from 2025-12-31 --to 2026-02-01` produces validated Parquet + manifest; idempotent; retries; pandera checks pass; clear log summary |
| **WP3** | Domain library (asof, errors, metrics, slices, risk) | WP0 (fixtures) | `backend/app/domain/` | All §4 properties tested; mypy strict clean; ≥90% coverage on `domain/`; documented sign convention |
| **WP4** | API layer and OpenAPI | WP2 snapshot loader, WP3 | `backend/app/api/`, `main.py` | Every §5 endpoint implemented, validated, and tested; `openapi.json` exported to `frontend/` for codegen |
| **WP5** | Frontend foundation | WP1, WP4 openapi | `frontend/src/{api,lib,components}` | Generated client compiles; layout, routing, theme, shared KPI/Chart wrappers, loading/error states |
| **WP6** | Decision Brief screen | WP5 | `features/brief/` | Matches §6; as-of timestamp visible; vintages toggle works; handles gaps |
| **WP7** | Accuracy screen | WP5 | `features/accuracy/` | All charts and KPIs wired; tooltips explain metrics; range filter works |
| **WP8** | Method & Data page | WP5 | `features/method/` | Pulls `/meta`; lists assumptions and caveats |
| **WP9** | Vercel deployment | WP4, WP6 | `vercel.json`, `api/index.py` | Public URL works in incognito; cold start <5 s; fallback decision recorded if bundle size fails |
| **WP10** | Polish, e2e smoke, README, demo | all | README, `docs/`, Playwright | README meets brief 3.2 (dirs, run steps, deployed link, **AI-tools disclosure**); smoke test passes |

**Suggested time box (≈14 h, leaving 2 h buffer):** WP0 0.5 · WP1 1 · WP2 1.5 · WP3 2.5 · WP4 1.5 · WP5 1 · WP6 1.5 · WP7 1.5 · WP8 0.5 · WP9 1 · WP10 1.5.

### Rules for every agent

1. **Domain code stays pure**: no IO, no FastAPI, no globals, with type hints throughout.
2. **Never fabricate data.** If a value is missing, return null plus a count of missing periods.
3. **All times UTC in storage and API;** convert to `Europe/London` only for the local-day and hour-of-day logic.
4. **Change the OpenAPI contract only via WP4**, then regenerate frontend types. Do not hand-edit generated files.
5. Every PR-sized change includes tests; CI must pass.
6. Record non-obvious decisions in `docs/decisions.md` (a few lines each).

---

## 9. Testing strategy (proportionate)

- **Unit and property tests** on `domain/` (the most valuable part; see §4.1).
- **Golden test:** a tiny hand-built fixture (3 targets × 3 vintages) whose expected as-of output and metrics are worked out by hand in the test file.
- **API tests** with FastAPI `TestClient` against the fixture snapshot, including 404 and 422 paths and the leakage rule.
- **Contract test:** the generated `openapi.json` matches the committed copy.
- **Frontend:** Vitest for formatters and hooks; one Playwright smoke (load brief → change date → chart renders → open accuracy page).
- **Data-quality gate at ingest:** unique `(startTime, publishTime)`, 30-min grid, non-negative MW, coverage report (expected vs actual rows).

---

## 10. Demo video storyline (≤10 min; start with this because evaluation begins with the video)

**Part 1: customer pitch (~5 min).** Lead with the business problem ("what do I need to buy tomorrow, and how much can I trust the wind forecast?"). Show the Decision Brief for a real January day, including the line "forecast as of 09:00 published at HH:MM". Show the risk-adjusted view ("buy X MW more for a P90 safety margin"). Move to the Accuracy page: headline bias and P95 shortfall, how error grows with horizon, and a clear, honest limitation slide (metered wind only, one month, cutoff assumption). Close with next steps (more data, embedded wind, demand and price integration).

**Part 2: tech review (~5 min).** Architecture diagram (§2) → why snapshot-first → the as-of join and its property tests (the "money slide") → leakage rule in the risk band → contract-first typing → Docker/Vercel trade-off → CI → AI-tool usage and what was human-verified → known limitations and the productionisation path.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Elexon param or response surprises | WP0 probe first; fixtures from real payloads |
| Many vintages per target → heavy queries | Pre-sort and index at load; precompute per-delivery-day vintage groups at cold start |
| Vercel bundle size with pandas | Measure early in WP1; fallback is polars or Heroku container from the same Dockerfile |
| Cold-start latency | Parquet is small; load lazily and cache at module level |
| Ambiguity in "decisions in January" or cutoff time | Explicit, configurable assumptions A1/A2, surfaced in the UI and README |
| Misreading metrics (MAPE blow-ups, sign confusion) | nMAE instead of MAPE; sign convention fixed, labeled on every chart |
| Scope creep beyond 16 h | Stretch items (persistence skill score, dark mode, CSV export) only after WP10 is done |

---

## 12. Definition of done

- [ ] Public Vercel URL works in incognito; the app loads January 2026 data and every endpoint in §5 responds.
- [ ] `docker compose up` runs the full stack locally from a clean clone.
- [ ] Public repo with anonymous name; README lists files and directories, how to start, the deployed link, and **AI-tools disclosure**.
- [ ] As-of selection proven by property tests; leakage rule implemented and visible in the UI.
- [ ] Unlisted YouTube video ≤10 min with both parts; all submitted URLs verified in incognito.
- [ ] Submission form completed.
