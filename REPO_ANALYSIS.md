# Repo Analysis: Sufail07/Wfdp (Wind Forecast Decision Portal)

**Scope:** every source, config, test and doc file in the repo at the latest commit (`3059836`), read in full. I also ran the backend and frontend tests, probed the API endpoints for status codes and timing, and rendered the histogram data shape headlessly.

**Not verified:** the deployed Vercel site (I could not fetch it), the live Elexon API (not reachable from my sandbox), and anything that needs a real browser (theme toggling, visual layout). Those items are marked *unverified*.

**Severity:** 🔴 fix before submitting · 🟠 fix soon · 🟡 polish

---

## 1. Verdict

The structure is good: clear layering, a correct as-of selection function, a thoughtful design system, and honest caveats in the docs. **But the submission is not safe to send as it stands**, mainly because the data in the app is synthetic while everything presents it as Elexon data. Several features that the video script would show also don't exist yet or don't work.

---

## 2. Critical findings

### 🔴 C1. The committed data is synthetic, but presented as real Elexon data
**Evidence**
- `backend/ingest/generate_mock.py` generates both datasets with random numbers (`np.random.seed(42)`, `seed(43)`).
- The parquet snapshot matches that generator exactly:
  - Exactly **7 vintages for every one of the 1,488 target half-hours** (10,416 rows = 31 × 48 × 7).
  - Only **five publish clock times** exist (00:00, 06:00, 09:00, 12:00, 18:00 UTC).
  - The latest vintage for every delivery day is **exactly 09:00 UTC on D-1**, i.e. built to match the cutoff.
  - Minimum horizon is **exactly 15.0 h**, which is why the 0–6h and 6–12h buckets are empty.
  - Daily mean forecast has a standard deviation of **24 MW**, while daily mean actuals vary by **1,476 MW**. Correlation between them is **−0.09**. The forecast has no skill because it was generated independently of the actuals.
- `manifest.json` labels it `"dataset_version": "elexon-bmrs-2026-01"`. The README, the Method page ("from Elexon BM Reports") and every chart footer ("Source: Elexon BMRS") say the same. The word "mock" appears nowhere in the app or README.

**Consequence:** every number you would quote in the video is an artifact of two unrelated random generators. For example, the flat horizon chart (MAE ≈ 1,101 / 1,415 / 1,327 / 1,387 MW) is just that mismatch, not a property of wind forecasts. Presenting this as real analysis would be a serious integrity problem.

**Fix:** ingest real data (see C2). If real data truly can't be obtained, label the data as synthetic on every page, in the README and in the video.

### 🔴 C2. Ingestion has never been run against the real API
- `ingest/fetch.py` and `probe_api.py` call `https://api.bmreports.com/BMRS/B1620/v1` and `B1830/v1` with `APIKey=demo`. To my knowledge that is Elexon's older BMRS API, which has been superseded by the Insights API (`data.elexon.co.uk`). I couldn't test it from here, so verify.
- `docs/data-notes.md` describes the endpoints and fields as "expected", with rate limits and volumes "to be confirmed". The "WP0 probe findings" were never actually measured.
- `ingest/` has **0% test coverage** and no fixtures-based tests, so there is no evidence the pipeline works.
- Ingestion also drops data you need: the plan needs WINDFOR forecasts published from at least 30–31 Dec, and actuals through 1 Feb (the manifest shows actuals end on 31 Jan and forecasts start on 2 Jan).

### 🔴 C3. The Decision Brief is missing core features
In `DecisionBrief.tsx`:
- `const [deliveryDate] = useState(DEFAULT_DATE)` has **no setter and no picker**. The user cannot choose a delivery day, and the default is the first day (2026-01-02), which has no risk band and no actuals.
- `useForecastRevisions` is fetched and the result is **discarded** (`_revisions`). The "show earlier forecasts" overlay doesn't exist (`VintagesToggle`, `AsOfCallout`, `MainChart`, `DeliveryDayPicker` are written but never used).
- **Actuals are never shown.** No endpoint returns actuals for a day, so forecast-vs-actual (the strongest demo moment) is impossible.
- **The "cutoff line" is a fixed CSS element at one third of the chart width** (`absolute left-1/3`) and is not tied to any time. The chart's x-axis covers only the delivery day, while the cutoff is on the previous day, so the line is both meaningless and misleading.

### 🔴 C4. Accuracy endpoints are very slow (measured)
Full-month request times on my machine, through FastAPI's test client:

| Endpoint | Time |
|---|---|
| `/accuracy/by-hour` | **33.9 s** |
| `/accuracy/by-horizon` | 9.5 s |
| `/accuracy/daily` | 9.2 s |
| `/accuracy/by-wind-level` | 6.9 s |
| `/accuracy/summary` | 1.9 s |
| `/accuracy/error-distribution` | 0.9 s |

`vercel.json` sets `maxDuration: 30`, so the by-hour call would likely time out on the full month (Vercel hardware may differ; *unverified*). The Accuracy page fires all six requests at once.

**Causes:**
1. `compute_metrics()` runs **two 1,000-iteration pandas bootstrap loops** every time it is called, and `compute_metrics_by_group()` calls it once per group (24 hours, 30 days, buckets). Single-day groups get a meaningless bootstrap.
2. Every handler **reloads the parquet files and recomputes SHA-256 checksums per request** (`load_snapshot()` inside the handlers), bypassing the in-memory cache set up in `main.py`.
3. `async def` handlers run blocking CPU work on the event loop.

### 🔴 C5. The risk band is statistically wrong and leaks the future
`domain/risk.py`:
- The margin is the P90 of **positive errors only** (`bin_errors[bin_errors > 0]`). That is not "covered 9 times in 10". Coverage with this margin is `(1 − p) + 0.9p`, where `p` is the share of over-forecasts, so it over-covers (about 93% when p = 0.74, 96% when p = 0.4). The UI label "Risk-Adjusted (P90)" and the pitch line "9 times out of 10" would be wrong. Use the unconditional quantile of signed error.
- **Look-ahead:** the "expanding window" uses actuals for every day before D, including **D-1**. At the D-1 09:00 cutoff, the actuals for D-1 haven't happened yet. Only days ≤ D-2 are legitimately known.
- Level bins are hard-coded (`<1000`, `<5000`, else) and unrelated to the data's distribution.
- The API response has an `over_forecast_quantile` field that is never populated (always `null`), and the suppression logic described in the docstring isn't applied. The band is returned (with `in_sample: false`) even for very small samples, and returns **404 on the default landing date**, which the UI silently ignores.

### 🔴 C6. Tests and CI are red
- **5 of 21 backend tests fail.** `tests/api/test_accuracy.py` calls `/decision-forecast`, but routes are mounted under `/api/...`, so you get 404s. One test (`..._out_of_range_returns_404`) passes for the wrong reason.
- Coverage is **44%**: `risk.py` 12%, `slices.py` 37%, all of `ingest/` 0%, API handlers 21–40%.
- Frontend: tsc passes and 22 tests pass, but 21 of those test formatting helpers and one tests the date picker in isolation. No chart or page is tested.
- **ESLint crashes** (`.eslintrc.cjs` uses `export default`, which is invalid in a CommonJS file), so the CI lint step fails.
- **The `openapi-drift` CI job always fails:** it writes `frontend/src/api/openapi.json`, which isn't in the repo, so `git status` shows it as new. The job also references an `openapi:generate` npm script that doesn't exist.
- The property tests for the as-of function use fixtures where every forecast is already before the cutoff, so the "never returns post-cutoff" test cannot fail in the interesting case.

---

## 3. High-priority findings

| # | Area | Finding |
|---|---|---|
| H1 | Docker | In `nginx.conf`, `location /api/ { proxy_pass http://backend:8000/; }` strips the `/api` prefix, but the backend serves `/api/...`. **Every API call through docker-compose would 404.** The CI compose job only checks `/health` and `/`, so it can't catch this. |
| H2 | Docker | Compose healthchecks use `curl`, which is not installed in `python:3.12-slim` or `nginx:alpine`, so both always report unhealthy. |
| H3 | Heroku | `heroku.yml` defines a second `frontend` process. To my knowledge Heroku only routes web traffic to the `web` process, so this isn't a working deployment. Treat as unverified or remove it. |
| H4 | Charts | `HistogramChart` passes bar data as `{x, y, ...}` objects without a `value` field to a bar series on a value axis. In my headless ECharts render of that data shape, **0 bars were drawn**; with `[x, y]` arrays, 20 were. Check in a browser. |
| H5 | API | `/forecast-revisions?max_vintages=5` slices **rows**, not vintages. Measured: it returns 5 rows for a single half-hour (1 startTime, 5 publish times). It also ignores the UI's chosen cutoff and uses the default one. |
| H6 | API | Input validation isn't wired. The Pydantic request models and `MAX_*` caps in `schemas.py` are unused. Measured: `cutoff_hour=25` and `cutoff_hour=-1` → **500**; `quantile=5` → **500**. |
| H7 | Meta | `coverage_start/end` are hard-coded (2026-01-01 to 2026-02-01) instead of derived from data. 2026-01-01 has no forecasts (404), and 2026-02-01 has forecasts but no actuals. The date pickers use these values. |
| H8 | API | `availability_lag_minutes` is applied in some endpoints but not others: `_load_aligned_pairs` (all accuracy endpoints) ignores it, and `decision_forecast` selects with it but reports `cutoff_utc` without it. Harmless at 0, wrong otherwise. |
| H9 | Frontend | `api/client.ts` is hand-written (376 lines) with `Record<string, any>` response types. The README and plan say it is generated from OpenAPI. Type safety across the stack, a stated selling point, is absent. |

---

## 4. Medium findings

**Backend**
- `ETag` header is sent, but conditional requests aren't handled (measured: `If-None-Match` → 200, not 304). `Cache-Control: public, max-age=300` is also applied to 404s, and uses `max-age`, not `s-maxage`, so a CDN may not cache it.
- Request logging mutates the global `logging.setLogRecordFactory` per request, which is not safe under concurrent async requests; use `contextvars`.
- The middleware calls `get_snapshot()`, so every request fails if the ASGI lifespan doesn't run (a risk on serverless). The loaded cache is otherwise unused (see C4).
- `/health` is at the root, not under `/api`, so on Vercel the rewrite sends it to the SPA, not the API. The README's endpoint table omits the `/api` prefix.
- The plausibility guard only logs (one warning per row). Nothing reaches the API response or UI.
- Bootstrap CIs cover only bias and MAE, not P95 (the headline risk number). The `min(n_eff, n_days * 48)` cap is meaningless, and failures are swallowed by `except Exception: continue`.
- `join_forecast_actual` treats `settlementDate + period` as UTC. Correct in January, wrong across clock changes. The real API's own `startTime` should be used.
- `compute_by_horizon_all_vintages` uses `<= to_date + 1 day`, which pulls in one extra half-hour of the next day.
- `meta.CAVEATS` hard-codes "Forecast accuracy improves as publish time approaches start time", which the app's own horizon chart doesn't show.
- `SnapshotData` uses deprecated Pydantic class-based `Config`.

**Frontend**
- The four Decision Brief KPI cards all show the same sparkline (the first 12 points of the forecast), which means nothing for "Total/Peak/Min/Mean". Each card also picks MW or GW separately, and a value of `0` renders as `--`.
- `TimeChart` uses `smooth: true`, passes raw ISO timestamps as x labels (unformatted), and aligns the risk series to the forecast series **by index**, so a skipped point silently shifts the line.
- `useResolvedColor` re-resolves only when the token changes, not the theme, so chart colours are likely stale after toggling dark/light mode (*unverified*). It also calls a hook inside a ternary, which the `react-hooks` lint rule flags.
- `AsOfCallout` has a stray `$` in `Move: ...${moveMW...}` and uses red/green, contradicting the colour-blind-safe design rule.
- Roughly 300 lines of components are unused (`KPIStrip`, `KPICard`, `MainChart`, `VintagesToggle`, `CutoffControl`, `DeliveryDayPicker`, `AsOfCallout`, `LineChart`, etc.).
- Accuracy page: every cutoff keystroke fires six requests (no debounce); a failed request other than the summary shows no error; the histogram markers default to `0 MW` when the percentile is missing; "small sample" counts calendar days in the range, not days with data; the horizon trend sentence compares only the first and last non-empty buckets.

**Security and supply chain**
- CSP allows `'unsafe-inline'` for scripts and styles.
- The README claims rate limiting via the Vercel firewall, but nothing in the repo configures it (*unverified*).
- `api/requirements.txt` has no version pins; the backend Dockerfile ignores `uv.lock` (it re-resolves with `uv pip compile`).
- CI: `trivy-action@master` is unpinned, `codecov-action@v3` is outdated, `npm audit ... || true` can never fail, and `uv pip install --system` is mixed with `uv run`.
- The data licence check (a high-severity item in the earlier review) is still open: the README says to verify redistribution terms, but the data is committed anyway.

**Repo hygiene**
- Agent and tool artefacts are committed: `.kilo/plans/`, `.agents/skills/`, `skills-lock.json`, `frontend/design/round1/*.html`.
- The challenge document itself (`REint Full Stack SWE challenge v4 Shared.docx`) and the planning docs are in the public repo. Check whether you're allowed to publish the assignment.
- The README lists `docs/decisions.md` and `frontend/src/hooks/`, which don't exist.
- The repo URL contains your GitHub username. My notes of the brief say it asked for an anonymous repo name, so check.
- `tsconfig.json` has a duplicate `isolatedModules` key.

---

## 5. What's good (keep)

- **`domain/asof.py` is correct and clear.** Cutoff is D-1 in London time, DST-aware, with `publishTime < startTime`, one row per target, and a configurable availability lag.
- The earlier bugs (cutoff date rebuilt in the frontend; peak MW shown as GW) are fixed. The headline sentence now uses `cutoff_utc` and the mean.
- Clean layering: `domain/` has no web imports, and there is a thin repository interface.
- Checksum verification on snapshot load, structured error responses, and request IDs.
- The README caveats are candid: licence, no auth, actuals not final, single month, availability lag.
- The Accuracy page follows the design plan: KPI numerals with `n`, plain-English bias line, horizon chart using all vintages, forecast-based wind bins with stable terciles, and small-sample notices.
- The design system (tokens, type, light and dark themes) is consistent.
- `tsc` passes, 16 backend tests pass, and the domain property tests exist.

---

## 6. File-by-file notes

| File | Notes |
|---|---|
| `README.md` | Honest caveats, but says real Elexon data; wrong endpoint paths; references missing files |
| `docs/data-notes.md` | Documents the legacy API; findings are "expected", not measured |
| `docs/ARCHITECTURE.md` | Not reviewed in depth (generated from the plan docs) |
| `backend/app/main.py` | Good structure; unsafe log-factory hack; ETag cosmetic; lifespan coupling; caches on errors |
| `backend/app/config.py` | Fine; add validation for cutoff/CORS |
| `backend/app/data/loader.py` | Checksum check is good; deprecated Config; reloaded per request by callers |
| `backend/app/repository/interface.py` | Good idea, but domain/API bypass it and the whole frame is copied on each call |
| `backend/app/domain/asof.py` | Correct |
| `backend/app/domain/errors.py` | Join is fine; UTC-as-local assumption for settlement date |
| `backend/app/domain/metrics.py` | Correct metrics; per-group double bootstrap causes the slowness |
| `backend/app/domain/slices.py` | Bucketing and terciles OK; boundary off-by-one in all-vintage horizon |
| `backend/app/domain/risk.py` | Statistically wrong margin; look-ahead on D-1; 12% test coverage |
| `backend/app/api/decision_forecast.py` | Reloads snapshot; lag inconsistency; log-only plausibility; no validation |
| `backend/app/api/accuracy.py` | Slow; duplicated imports; ignores lag |
| `backend/app/api/risk_band.py` | 404 on first days; dead field |
| `backend/app/api/forecast_revisions.py` | Row-slice bug; ignores cutoff |
| `backend/app/api/meta.py` | Hard-coded coverage; hard-coded accuracy claim |
| `backend/app/api/schemas.py` | Good caps defined, mostly not applied |
| `backend/ingest/*` | Legacy API, never probed; mock generator is what produced the data; 0% tests |
| `backend/tests/*` | Domain tests OK; API tests wrong paths |
| `backend/Dockerfile` | Non-root is good; ignores lockfile; no healthcheck |
| `api/index.py`, `api/requirements.txt` | Works as an entrypoint; unpinned dependencies |
| `vercel.json` | Rewrites fine; permissive CSP; 30 s limit vs 34 s endpoint |
| `docker-compose.yml`, `frontend/nginx.conf` | API proxy path bug; curl healthchecks |
| `heroku.yml` | Likely not workable |
| `.github/workflows/ci.yml` | Lint, drift and compose jobs would fail; unpinned actions |
| `frontend/src/api/client.ts` | Hand-written, `any` types |
| `frontend/src/features/brief/*` | Missing picker, actuals, vintages; fake cutoff line; many unused components |
| `frontend/src/features/accuracy/Accuracy.tsx` | Mostly good; no debounce; partial error handling |
| `frontend/src/features/method/Method.tsx` | Says "Elexon BM Reports"; no synthetic disclosure |
| `frontend/src/components/charts.tsx`, `TimeChart.tsx` | Histogram data shape; smoothing; index alignment; theme staleness |
| `frontend/src/utils/format.ts` | Clean and tested |
| `frontend/tests/*` | Utility tests only |
| `.eslintrc.cjs`, `tsconfig.json` | ESLint config broken; duplicate key |

---

## 7. Recommended fix order

**P0: must be done (about 4–5 h)**
1. Replace the mock data with real Elexon data via the current API. Probe the live endpoints first and save real fixtures. Include 30–31 Dec forecasts and actuals through 1 Feb. If this is impossible, disclose the data as synthetic everywhere (README, Method page, chart footers, video).
2. Precompute or cache all accuracy results at startup (or a build step). Compute bootstraps only for the summary. Load the snapshot once, not per request.
3. Add the delivery-date picker, actuals overlay and vintages overlay to the Decision Brief; derive `coverage_start/end` from data. Fix or remove the fake cutoff line.
4. Fix the risk band: unconditional quantile of signed error, history up to D-2 only, data-derived bins, show a clear "not enough history" state instead of a 404.

**P1: before recording (about 3 h)**
5. Fix the histogram data shape and verify it in a browser. Fix the revisions endpoint to return N vintages.
6. Wire validation (cutoff 0–23, minute 0–59, quantile 0.5–0.999, `max_vintages`) and return 422, not 500.
7. Fix the tests (use the `/api` prefix; add real as-of cases; add risk and ingest tests). Fix the ESLint config and the drift job, or remove them.
8. Fix the nginx proxy path and compose healthchecks, or remove the Docker claims you can't demonstrate.

**P2: polish**
9. Real generated API client (or remove the claim), pinned dependencies, tighter CSP, ETag/304, repo clean-up (remove `.kilo`, `.agents`, the challenge docx), README accuracy, anonymous repo name if required.

**Before the video:** re-check every number and claim in `VIDEO_SCRIPTS.md` against the corrected app, especially "covered nine times out of ten", the horizon trend, and any statement about the data source.
