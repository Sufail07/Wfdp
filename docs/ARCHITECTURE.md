# Wind Forecast Decision Portal — Architecture Overview

**Source of record:** `ARCHITECTURE_PLAN.md` (build plan) + `ARCHITECTURE_REVIEW.md` (adversarial review).  
**Where they conflict, the review wins.**  
**Version:** 1.0  
**Status:** Draft — implementation in progress

---

## 1. Executive Summary

The Wind Forecast Decision Portal helps a UK utility trader decide how much day-ahead power to buy based on the latest available wind forecast at their decision cutoff (D-1 09:00 Europe/London), and then quantify how wrong those forecasts have been.

- **System:** Snapshot-first, stateless FastAPI backend serving a React SPA. Elexon/BMRS `FUELHH` (actuals) and `WINDFOR` (forecasts) are ingested offline into versioned Parquet snapshots committed to the repo; the API loads the snapshot into memory at cold start and computes analytics on request.
- **Key constraints:** Decisions made in January 2026 (delivery 2 Jan–1 Feb 2026); cutoff D-1 09:00 London; Vercel serverless primary / Docker local / Heroku fallback; ≤16 h effort; public repo with anonymous name; README must disclose AI-tool use; ≤10 min demo video.
- **Screens:** Decision Brief (`/`), Forecast Accuracy (`/accuracy`), Method & Data (`/method`).

---

## 2. System Context Diagram

```mermaid
flowchart LR
    E[Elexon / BMRS API<br/>FUELHH + WINDFOR]:::external
    CLI[ingest CLI<br/>httpx + tenacity + pandera]:::process
    SNAP[(Parquet snapshot + manifest.json)<br/>committed to repo]:::store
    API[FastAPI<br/>stateless, read-only]:::process
    DOM[domain/<br/>pure functions<br/>asof, errors, metrics, slices, risk]:::domain
    UI[React SPA<br/>Vite + TanStack Query + ECharts]:::process

    E -->|offline pull| CLI
    CLI -->|validate + write| SNAP
    SNAP -->|load at cold start| API
    API -->|JSON| UI
    API <-->|calls| DOM

    classDef external fill:#f9f,stroke:#333,stroke-width:2px
    classDef process fill:#bbf,stroke:#333,stroke-width:2px
    classDef store fill:#bfb,stroke:#333,stroke-width:2px
    classDef domain fill:#ffb,stroke:#333,stroke-width:2px
```

---

## 3. Data Flow & Lifecycle

### 3.1 Ingestion (offline CLI)

`python -m ingest refresh` pulls from Elexon, validates with pandera, and writes:

- `backend/data/snapshot/fuelhh.parquet` — actuals (WIND fuel type)
- `backend/data/snapshot/windfor.parquet` — forecast vintages
- `backend/data/snapshot/manifest.json` — fetch time, row counts, checksums, date ranges

Ingestion is idempotent, retryable, and chunked by day with exponential backoff (Elexon limits confirmed in WP0). No request-time dependency on Elexon — the demo cannot fail because the upstream API is down.

### 3.2 Serving (cold start → in-memory → FastAPI)

1. On app startup (lifespan hook in `backend/app/main.py:13`), `load_snapshot()` reads Parquet + manifest into `SnapshotData`.
2. Each request uses the in-memory `pandas.DataFrame` objects; domain functions are pure (no IO, no FastAPI, no globals).
3. Every response includes `meta.snapshot_id` (the manifest `fetch_time`) so clients know which data version they are viewing.

### 3.3 Frontend consumption

TanStack Query fetches from `/api/*`; ECharts renders time-axis charts; React Router handles three routes. All timestamps ISO-8601 UTC with `Z`; `Europe/London` used only for display/day-boundary logic.

---

## 4. Core Domain Logic (The "Money Slide")

Location: `backend/app/domain/`. Pure functions, type-hinted, mypy `--strict`.

### 4.1 As-of selection (`asof.py`)

`select_decision_forecast()` picks, for each target half-hour on delivery day D, the forecast with the latest `publishTime` ≤ cutoff (D-1 09:00 London → UTC) and `publishTime < startTime` (no future knowledge). Adds `horizon_h`.

Properties (tested with hypothesis):
1. Never returns `publishTime > cutoff`.
2. ≤1 row per `startTime`.
3. Adding a forecast published after cutoff never changes output.
4. Adding a later-but-before-cutoff forecast changes output to that forecast.
5. Targets with no eligible forecast return a gap, never a silent fill.

**Review finding 1.2 (🔴):** `publishTime` may not equal "available to trader" due to ingestion lag. Add configurable `availability_lag_minutes` (default 0) to as-of selection. State assumption in README, Method page, video. → **Sprint 2.**

### 4.2 Errors (`errors.py`)

`join_forecast_actual()` left-joins decision forecast to actuals on `startTime`. Sign convention: `errorMW = forecastMW − actualMW`; positive = over-forecast = shortfall risk for the buyer (they under-bought because wind came in lower than expected). Missing actuals flagged `missing_actual`, never silently filled.

### 4.3 Metrics (`metrics.py`)

Computed on aligned pairs only; always returns `n` alongside:

| Metric | Definition |
|--------|-----------|
| Bias (ME) | mean(error) |
| MAE, RMSE | MW |
| nMAE | MAE / mean(actual) — avoids MAPE blow-up near zero |
| Error percentiles | P5, P50, P90, P95, P99 (signed and absolute) |
| Over-forecast share | % periods with error > 0 |
| Tail-risk | P95 over-forecast in MW |

### 4.4 Slices (`slices.py`)

By horizon (all vintages, not just decision), by hour of day (London), by wind-level tercile, by delivery day, error distribution histogram + quantiles.

**Review finding 1.4 (🔴):** Half-hourly errors within a day are autocorrelated → effective sample size << 1.5k. Add day-level block bootstrap CI on headline metrics, show effective sample size, make risk margin level/horizon-dependent, suppress band when expanding-window sample too small, calendar bias caveat. → **Sprint 3.**

### 4.5 Risk band (`risk.py`)

`compute_risk_band()` estimates the over-forecast quantile (default P90) from delivery days < D only (expanding window). Falls back to pooled distribution with visible `in_sample: false` badge when < `min_sample_days` (default 3). `risk_adjusted_mw = forecast_mw − q_over`.

**Leakage rule:** never use future data to estimate the band for day D. Suppress band when sample too small (review 1.4). → **Sprint 3.**

---

## 5. API Contract Summary

Base path `/api`. All timestamps ISO-8601 UTC with `Z`. All MW as floats. Every response includes `meta.snapshot_id`. Validation errors → 422; out-of-coverage dates → 404 with clear message; never 500 on missing data (return gaps + counts).

| Method & path | Query params | Returns |
|---|---|---|
| `GET /health` | — | `{status, snapshot_id}` |
| `GET /meta` | — | coverage, defaults, snapshot manifest (fetched_at, row counts), data-source URLs, assumptions, caveats |
| `GET /decision-forecast` | `delivery_date`, `cutoff_hour?`, `cutoff_minute?` | `cutoff_utc`, points `[{start_time, forecast_mw, publish_time, horizon_h, actual_mw|null}]`, summary |
| `GET /forecast-revisions` | `delivery_date`, `max_vintages?` | vintage series with `publish_time` per vintage + `cutoff_eligible` flag |
| `GET /accuracy/summary` | `from`, `to`, `cutoff_hour?`, `cutoff_minute?` | metrics on decision forecasts over range |
| `GET /accuracy/by-horizon` | `from`, `to` | metrics per horizon bucket (all vintages) |
| `GET /accuracy/by-hour` | `from`, `to`, `cutoff_hour?`, `cutoff_minute?` | metrics per local hour of day |
| `GET /accuracy/by-wind-level` | `from`, `to`, `cutoff_hour?`, `cutoff_minute?` | metrics per wind-level bin |
| `GET /accuracy/daily` | `from`, `to`, `cutoff_hour?`, `cutoff_minute?` | one metrics row per delivery day |
| `GET /accuracy/error-distribution` | `from`, `to`, `cutoff_hour?`, `cutoff_minute?`, `bins?` | histogram + quantiles |
| `GET /risk-band` | `delivery_date`, `quantile?` (default 0.9), `cutoff_hour?`, `cutoff_minute?` | per-period `{start_time, forecast_mw, risk_adjusted_mw}` + `{estimation_window, in_sample}` |

**Review findings to apply:**
- 2.1 (🟠): `Cache-Control` + `ETag` keyed on snapshot ID; precompute default-cutoff results at ingest/cold start. → **Sprint 3.**
- 2.2 (🟠): Hard-cap range length, bins, vintages; validate cutoff window; 422 on violations. → **Sprint 3.**
- 2.5 (🟠): Precompute by-horizon at ingest, not per request. → **Sprint 3.**

Contract-first discipline: only WP4 changes OpenAPI; regenerate frontend types via `openapi-typescript`; never hand-edit generated files.

---

## 6. Frontend Architecture

- **Build:** Vite (static output suits Vercel).
- **Server state:** TanStack Query (caching, loading/error states).
- **Routing:** React Router (3–4 routes).
- **Charts:** Apache ECharts (`echarts-for-react`, tree-shaken) — time-axis zoom/brush, confidence bands, histograms, heatmaps.
- **UI:** Tailwind CSS + shadcn/ui (Radix).
- **API types:** `openapi-typescript` generated from backend `openapi.json`.
- **Quality:** ESLint, Prettier, Vitest + Testing Library, Playwright (one smoke test — deferrable per review 5.2).

**Review finding 2.6 (🟡):** Cap vintages shown in revisions overlay, downsample, lazy-load. → **Sprint 4.**

Routes: `/` Decision Brief, `/accuracy` Forecast Accuracy, `/method` Method & Data. Every chart annotated with as-of time; units on every number; tooltips for MAE/RMSE/nMAE.

---

## 7. Deployment & Operations

| Target | Details |
|--------|---------|
| Local dev | `docker compose up` — backend (FastAPI/uvicorn) + frontend (nginx), nginx proxies `/api` → backend |
| Primary | Vercel — Vite static build + FastAPI Python serverless function at `/api/*` (`api/index.py`); snapshot ships via `includeFiles` |
| Fallback | Heroku container (`heroku.yml`, same `backend/Dockerfile`) |
| CI | GitHub Actions: ruff, mypy, pytest, frontend lint/test/build, `docker compose build`, OpenAPI drift check |

**Review findings:**
- 1.1 (🔴): Measure Vercel bundle with pandas+pyarrow in WP1; if close to 250 MB, switch to polars/DuckDB up front. Verify Vercel config against current docs. → **Sprint 1.**
- 2.3 (🟡): Lazy-load + module-level cache; record cold-start time in README. → **Sprint 4.**
- 4.2 (🟠): No wildcard CORS; restrict to dev origin if needed. → **Sprint 2.**
- 4.3 (🟠): Rate limiting via Vercel firewall (not in-app across serverless instances). → **Sprint 2.**
- 4.5 (🟠): Security headers (CSP, `X-Content-Type-Options`, frame protections) via Vercel config / nginx. → **Sprint 2.**
- 4.6 (🟡): Container hardening — non-root (already), minimal base image, image scanning in CI, no secrets in layers. → **Sprint 2.**

---

## 8. Testing Strategy

- **Unit + property tests** on `domain/` — hypothesis on as-of join is highest value.
- **Golden test:** tiny hand-built fixture (3 targets × 3 vintages) with expected output worked out by hand.
- **API tests:** FastAPI `TestClient` against fixture snapshot, including 404/422 paths and leakage rule.
- **Contract test:** generated `openapi.json` matches committed copy.
- **Frontend:** Vitest for formatters/hooks; one Playwright smoke (load brief → change date → chart renders → open accuracy page) — deferrable if time slips.
- **Data-quality gate at ingest:** unique `(startTime, publishTime)`, 30-min grid, non-negative MW, coverage report (expected vs actual rows).

---

## 9. Remediation Plan (from ARCHITECTURE_REVIEW.md)

All findings from `ARCHITECTURE_REVIEW.md` are listed below with severity, status, owner, ETA, and acceptance criteria. Where the review conflicts with `ARCHITECTURE_PLAN.md`, the review wins.

### 9.1 Design-changing findings (Sprint 1 — before WP1 completes)

| # | Finding | Sev. | Category | Status | Owner | ETA | Acceptance criteria | Cross-ref |
|---|---------|------|----------|--------|-------|-----|---------------------|-----------|
| 1.1 | Vercel bundle: pandas+pyarrow; fallback was backwards | 🔴 | Design | ☐ Not started | Tech lead | Sprint 1 | Deployed hello-world FastAPI function with real deps; bundle measured vs 250 MB limit; polars/DuckDB decision recorded | `vercel.json`, `backend/pyproject.toml` |
| 1.2 | Look-ahead bias: `publishTime` vs availability lag | 🔴 | Correctness | ☐ Not started | Tech lead | Sprint 1 | Elexon probed for availability/ingestion timestamp; `availability_lag_minutes` config added (default 0); assumption stated in README + Method page + video | `backend/app/domain/asof.py`, `backend/app/config.py`, `README.md` |
| 1.3 | Actuals are not final (revisions) | 🔴 | Data quality | ☐ Not started | Tech lead | Sprint 1 | Manifest records fetch time + dataset version; Method page shows it; accuracy worded "versus actuals as of `<fetch time>`" | `backend/data/snapshot/manifest.json`, `backend/app/api/meta.py`, `frontend/src/features/method/` |
| 1.4 | Statistical overconfidence (autocorrelation, constant margin, expanding-window) | 🔴 | Analytics | ☐ Not started | Tech lead | Sprint 3 | Day-level block bootstrap CI on headline metrics; effective sample size shown; risk margin level/horizon-dependent; band suppressed when sample too small; calendar bias disclaimer on Method page | `backend/app/domain/risk.py`, `backend/app/domain/metrics.py`, `frontend/src/features/method/` |
| 1.5 | Unverified data-volume assumption | 🔴 | Scoping | ☐ Not started | Tech lead | Sprint 1 | WP0 reports actual WINDFOR row counts, vintages per target, Parquet size; snapshot size decision recorded | `docs/data-notes.md`, `backend/ingest/` |

### 9.2 Performance & scalability (Sprint 2–4)

| # | Finding | Sev. | Category | Status | Owner | ETA | Acceptance criteria | Cross-ref |
|---|---------|------|----------|--------|-------|-----|---------------------|-----------|
| 2.1 | No response caching / precomputation | 🟠 | Performance | ☐ Not started | Tech lead | Sprint 3 | `Cache-Control` + `ETag` keyed on snapshot ID; default-cutoff results precomputed at ingest/cold start | `backend/app/main.py`, `backend/app/api/` |
| 2.2 | Unbounded user inputs (DDoS vector) | 🟠 | Security | ☐ Not started | Tech lead | Sprint 3 | Hard-caps on range length, bins, vintages; cutoff validated to sane window; 422 on violations | `backend/app/api/schemas.py`, `backend/app/api/accuracy.py` |
| 2.3 | Cold starts multiply | 🟡 | Ops | ☐ Not started | Tech lead | Sprint 4 | Lazy-load + module-level cache; measured cold-start time in README | `backend/app/main.py`, `README.md` |
| 2.4 | Elexon limits unknown | 🟠 | Reliability | ☐ Not started | Tech lead | Sprint 4 | Elexon rate limits confirmed; chunked-by-day ingest with backoff; idempotent + resumable | `backend/ingest/fetch.py`, `docs/data-notes.md` |
| 2.5 | By-horizon touches all vintages (heavy) | 🟠 | Performance | ☐ Not started | Tech lead | Sprint 3 | By-horizon precomputed at ingest, not per request | `backend/ingest/`, `backend/app/api/accuracy.py` |
| 2.6 | Frontend chart load (vintages overlay) | 🟡 | UX | ☐ Not started | Frontend lead | Sprint 4 | Vintages capped, downsampled, revisions overlay lazy-loaded | `frontend/src/features/brief/` |
| 3.1 | Repository interface for storage abstraction | 🔴 | Architecture | ☐ Not started | Tech lead | Sprint 2 | Thin interface (`get_forecasts`, `get_actuals`) so storage can swap pandas→polars→DuckDB→Postgres without touching metrics | `backend/app/domain/`, new `backend/app/repository/` |
| 3.2–3.8 | Scalability paths (object storage, DuckDB, multi-tenant, Redis, scheduled ingestion) | 🟡 | Future | ☐ Not started | Tech lead | Future | Documented as known limitations / productionisation path | `ARCHITECTURE_REVIEW.md` §3 |

### 9.3 Security (Sprint 2)

| # | Finding | Sev. | Category | Status | Owner | ETA | Acceptance criteria | Cross-ref |
|---|---------|------|----------|--------|-------|-----|---------------------|-----------|
| 4.1 | No authentication / roles | 🟡 | Security | ☐ Not started | Tech lead | Sprint 4 | Documented as known gap; first productionisation item; not hidden | `README.md`, `frontend/src/features/method/` |
| 4.2 | CORS wildcard | 🟠 | Security | ☐ Not started | Tech lead | Sprint 2 | No `allow_origins=["*"]`; restricted to dev origin for local dev | `backend/app/config.py`, `backend/app/main.py` |
| 4.3 | No rate limiting | 🟠 | Security | ☐ Not started | Tech lead | Sprint 2 | Vercel firewall / rate-limit rules configured | `vercel.json` |
| 4.4 | Supply chain (lockfiles, auditing, update bot) | 🟠 | Security | ☐ Not started | Tech lead | Sprint 2 | Lockfiles committed; `pip-audit` + `npm audit` + Dependabot in CI; pinned base images/versions | `.github/workflows/ci.yml`, `backend/pyproject.toml`, `frontend/package-lock.json` |
| 4.5 | Missing security headers | 🟠 | Security | ☐ Not started | Tech lead | Sprint 2 | CSP, `X-Content-Type-Options`, frame protections set via Vercel config / nginx; verified with header scanner | `vercel.json`, `frontend/nginx.conf` |
| 4.6 | Container hardening | 🟡 | Security | ☐ Not started | Tech lead | Sprint 2 | Non-root user (done), minimal base image, image scanning in CI, no secrets in layers | `backend/Dockerfile`, `.github/workflows/ci.yml` |
| 4.7 | Data licence for public repo redistribution | 🔴 | Security | ☐ Not started | Tech lead | Sprint 1 | Elexon/BMRS licence terms checked; attribution/licence text in README + Method page; if restrictive, commit tooling + small sample only | `README.md`, `frontend/src/features/method/`, `backend/data/snapshot/` |
| 4.8 | Snapshot integrity (checksums not verified at load) | 🟠 | Security | ☐ Not started | Tech lead | Sprint 2 | Checksums verified on load; fail loudly on mismatch | `backend/app/data/loader.py` |
| 4.9 | Error and log hygiene | 🟠 | Security | ☐ Not started | Tech lead | Sprint 4 | Structured JSON logs + request IDs; `/meta` freshness field; generic 5xx messages (no stack traces) | `backend/app/main.py`, `backend/app/api/meta.py` |

### 9.4 Delivery & process (Sprint 4)

| # | Finding | Sev. | Category | Status | Owner | ETA | Acceptance criteria | Cross-ref |
|---|---------|------|----------|--------|-------|-----|---------------------|-----------|
| 5.1 | Time budget optimistic | 🔴 | Process | ☐ Not started | PM | Sprint 4 | Schedule re-baselined with explicit video (~1.5–2 h) + submission time | `ARCHITECTURE_PLAN.md` §8 |
| 5.2 | Scope creep | 🟠 | Process | ☐ Not started | PM | Sprint 4 | Defer: Playwright e2e, by-wind-level view, revisions overlay, Heroku fallback, dark mode. Keep: strict typing on `domain/`, property tests on as-of join | `ARCHITECTURE_PLAN.md` §8 |
| 5.3 | Observability thin | 🟠 | Process | ☐ Not started | Tech lead | Sprint 4 | Structured JSON logs + request IDs + `/meta` freshness field | `backend/app/main.py`, `backend/app/api/meta.py` |
| 5.4 | Parallel-agent collisions | 🟠 | Process | ☐ Not started | All | Ongoing | Strict file ownership; only WP4 changes contract; CI green before merge | `ARCHITECTURE_PLAN.md` §8 |
| 5.5 | Demo fragility | 🟡 | Process | ☐ Not started | PM | Sprint 4 | Demo recorded against final deployment; backup recording; incognito test | `docs/demo-script.md` |

---

## 10. Known Limitations & Caveats

| # | Limitation | Disclosure location |
|---|-----------|--------------------|
| L1 | Metered wind only (FUELHH WIND); excludes embedded wind | README §Assumptions, Method page, video |
| L2 | Single month of data (January 2026); calendar bias — one month of winter wind says little about other seasons | Method page, video |
| L3 | Cutoff assumption D-1 09:00 London may differ from actual trader workflows; `availability_lag_minutes` default 0 (not yet probed for real lag) | README, Method page, video |
| L4 | Actuals are not final — FUELHH values can be revised in later settlement runs; accuracy is "versus actuals as of `<fetch time>`" | Method page, `/meta` |
| L5 | No authentication or roles — public demo; real client portal needs SSO + RBAC + audit logging | README, Method page |
| L6 | No database — Parquet snapshots loaded in memory per serverless instance; cold starts multiply at scale | README, Vercel trade-off statement |
| L7 | Data licence — Elexon/BMRS redistribution terms must be verified before committing data to a public repo | README, Method page |
| L8 | Half-hourly errors autocorrelated within a day; effective sample size << 1.5k; bootstrap CI and effective-n shown where implemented | Method page |

---

## 11. Acceptance Criteria

- [ ] `docs/ARCHITECTURE.md` exists and is comprehensive (this document)
- [ ] All 🔴 and 🟠 findings from `ARCHITECTURE_REVIEW.md` are listed in §9 with status checkboxes
- [ ] Remediation plan has clear owners, ETAs, and acceptance criteria
- [ ] Document is readable by both technical and semi-technical stakeholders
- [ ] Included in repo and referenced from `README.md`
- [ ] Cross-references point to actual files (verified against repo layout)

---

## 12. Open Questions (for PM / tech lead)

1. **Format preference:** Should `ARCHITECTURE.md` live at repo root or in `docs/`? (This document is at `docs/ARCHITECTURE.md`.)
2. **Diagramming tool:** Mermaid used here; acceptable, or prefer PlantUML/ASCII?
3. **Remediation tracking:** Should each remediation item become a GitHub issue, or stay in the §9 markdown table?
4. **Timeline:** What is the hard deadline for completing remediations before submission?
5. **Scope cut authority:** Who authorizes cutting scope items (§9.2, #5.2) if time runs short?
