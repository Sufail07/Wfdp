# Architecture Review: Wind Forecast Decision Portal

**Reviews:** `ARCHITECTURE_PLAN.md`
**Purpose:** Adversarial review of the plan for scalability, security, throughput, correctness, and delivery risk. Intended to be read by coding agents and the human supervisor alongside the plan. Where this document conflicts with the plan, **this document wins** until the plan is updated.

**Overall verdict:** The plan is sound for a one-month, public-data pilot. It has several weaknesses that change the design (§1), real scale and security gaps that should be disclosed rather than hidden (§3, §4), and a delivery estimate that is optimistic (§5).

**Severity key:** 🔴 fix before building · 🟠 fix during build · 🟡 document as a known limitation

---

## 1. Design-changing findings

### 1.1 🔴 Vercel bundle size: pandas + pyarrow, and the fallback was backwards
- **Issue:** The plan chose pandas + pyarrow and treated polars as a *fallback if the bundle is too big*. Those libraries are heavy against Vercel's serverless function size limit, so the risky choice was the default.
- **Also:** The `vercel.json` / Python-runtime setup in the plan was written from memory. Vercel's Python support changes, so it is unverified.
- **Action:**
  1. In WP1, build a hello-world FastAPI function with the real dependency set and deploy it. Measure the bundle.
  2. If it is close to the limit, switch to **polars** or **DuckDB** up front instead of treating them as a fallback.
  3. Verify all Vercel configuration against current official docs before relying on it.

### 1.2 🔴 Look-ahead bias: `publishTime` may not equal "available to the trader"
- **Issue:** The brief defines `publishTime` as when the forecast was *created*. If there is a lag before it appears on BMRS, then "latest forecast with `publishTime` ≤ cutoff" can include forecasts the trader did not yet have. That inflates apparent accuracy, which is exactly the leakage the plan claims to prevent.
- **Action:**
  1. In WP0, check whether the API exposes any availability or ingestion timestamp, and look for a publication lag.
  2. Add an optional, configurable `availability_lag_minutes` (default 0) to the as-of selection.
  3. State the assumption explicitly in the README, the Method page, and the video.

### 1.3 🔴 Actuals are not final
- **Issue:** FUELHH values can be revised in later settlement runs. The snapshot freezes one version, so accuracy results depend on *when* actuals were fetched.
- **Action:** Record fetch time and dataset version in the manifest, show it on the Method page, and word accuracy claims as "versus actuals as of `<fetch time>`".

### 1.4 🔴 Statistical overconfidence
| Problem | Why it matters | Mitigation |
|---|---|---|
| ~31 independent days; half-hourly errors within a day are strongly autocorrelated | Effective sample size is far smaller than ~1,500 points, so P95 is much less certain than displayed | Show `n` and effective days; add a **day-level block bootstrap** confidence interval on headline metrics |
| One constant MW margin for the risk band | Error grows with wind output, so the margin is too small on windy days and too big on calm ones | Make the margin depend on forecast level (binned) or lead time; at minimum, disclose the limitation |
| Expanding-window quantiles in early January | The first days have almost no history | Keep the minimum-sample fallback and the visible "in-sample" badge (already in plan); also suppress the band when the sample is too small |
| Calendar bias | One month of winter wind says little about other seasons | State clearly on the Method page and in the pitch |

### 1.5 🔴 Unverified data-volume assumption
- **Issue:** The plan states WINDFOR volume is "order of 10⁴–10⁵ rows" without having measured it. If forecast vintages per target are numerous, the in-memory design may need rethinking.
- **Action:** WP0 must report actual row counts, vintages per target, and the Parquet size. If the snapshot is large, revisit DuckDB (query without full load) before building the rest.

---

## 2. Throughput and performance

| # | Sev. | Finding | Action |
|---|---|---|---|
| 2.1 | 🟠 | **No response caching.** Every request recomputes pandas aggregations; serverless instances do not share memory. The data is immutable per snapshot. | Send `Cache-Control` + `ETag` keyed on snapshot ID so the CDN absorbs repeats. **Precompute** default-cutoff results (summary, by-hour, by-horizon, daily) at ingest or cold start. |
| 2.2 | 🟠 | **Unbounded user inputs.** `from`/`to`, `bins`, `max_vintages`, and cutoff are all user-controlled; a single request can force heavy computation. | Hard-cap range length, bins, and vintages. Validate cutoff to a sane window. Return 422 on violations. |
| 2.3 | 🟡 | **Cold starts multiply.** Each new serverless instance loads its own copy of the data. Fine at MB scale; breaks at GB scale. | Lazy-load once per instance and cache at module level. Record measured cold-start time in the README. |
| 2.4 | 🟠 | **Elexon limits unknown.** The stream endpoints may cap date ranges per request or rate-limit callers. | Confirm limits in WP0. Chunk by day with exponential backoff and a polite request rate. Make ingestion idempotent and resumable. |
| 2.5 | 🟠 | **By-horizon analysis touches all vintages**, the heaviest query in the app. | Precompute at ingest, not per request. |
| 2.6 | 🟡 | **Frontend chart load.** Overlaying many vintages could be heavy on a laptop. | Cap vintages shown, downsample, and lazy-load the revisions overlay. |

---

## 3. Scalability: how it breaks as the problem grows

| What grows | Where it breaks | Path forward |
|---|---|---|
| Months or years of data | Parquet in git bloats the repo; every data refresh requires a redeploy | Object storage + scheduled ingestion job |
| Rows beyond per-instance memory | Memory limits on serverless; full-load cold starts | **DuckDB** over Parquet, or Postgres/Timescale with an index on (target time, publish time). The as-of join maps to `DISTINCT ON` or a lateral join. |
| More markets, fuels, or clients | One global config and no tenant concept | Per-tenant settings; a data-access interface |
| Many concurrent users | Per-instance in-memory cache is ineffective | CDN caching; shared cache (e.g. Redis) if needed |
| Live or intraday use | Snapshot model has no freshness path beyond a manual CLI | Scheduled ingestion with freshness monitoring and alerting |

**Design flaw to correct:** the plan calls the domain code "pure", but its interface is a pandas DataFrame, so it is coupled to pandas. Define a thin **repository interface** (`get_forecasts(range)`, `get_actuals(range)`) so the storage engine can change (pandas → polars → DuckDB → Postgres) without touching the metrics logic.

---

## 4. Security

For public data and a demo the risk is low. Gaps to close or to state openly:

| # | Sev. | Finding | Action |
|---|---|---|---|
| 4.1 | 🟡 | **No authentication or roles.** Fine for a pilot, but the pitch emphasises regulated, defensible decisions; a real client portal needs SSO, role-based access, and audit logging. | Document as a known gap and as the first productionisation item. Do not hide it. |
| 4.2 | 🟠 | **CORS.** Plan lists CORS in the app, but same-origin deployment does not need it. | Don't enable wildcard CORS. If needed for local dev, restrict to the dev origin. |
| 4.3 | 🟠 | **No rate limiting** on a public compute endpoint. | Use Vercel firewall / rate-limit rules. An in-app limiter does not work across serverless instances. |
| 4.4 | 🟠 | **Supply chain.** No lockfile discipline, dependency auditing, or update bot. | Commit lockfiles; add `pip-audit`, `npm audit`, and Dependabot to CI; pin base images and versions. |
| 4.5 | 🟠 | **Missing security headers** (CSP, `X-Content-Type-Options`, frame protections). | Set via Vercel config / nginx; verify with a header scanner. |
| 4.6 | 🟡 | **Container hardening.** | Non-root user (already planned), minimal base image, image scanning in CI, no secrets in layers. |
| 4.7 | 🔴 | **Data licence not considered.** Elexon data is governed by BMRS licence terms; the plan commits it to a *public* GitHub repo. | Check redistribution terms before committing data; add the required attribution/licence text to the README and the Method page. If terms are restrictive, commit only the ingestion tooling and a small sample. |
| 4.8 | 🟠 | **Snapshot integrity.** Manifest holds checksums, but nothing says they are verified at load. | Verify checksums on load and fail loudly on mismatch. |
| 4.9 | 🟠 | **Error and log hygiene.** | Return generic 5xx messages (no stack traces); log server-side with request IDs. |

**What is already fine:** no secrets, no personal data, a read-only API, and a fixed upstream URL in ingestion (no user-controlled outbound requests, so no SSRF surface).

---

## 5. Delivery and process risks

| # | Sev. | Finding | Action |
|---|---|---|---|
| 5.1 | 🔴 | **Time budget is optimistic.** Work packages total ~14 h but video recording/rehearsal/editing (~1.5–2 h), the submission form, incognito checks, and debugging are not budgeted, so the total likely exceeds the 16 h cap. | Re-baseline the schedule with explicit video and submission time. |
| 5.2 | 🟠 | **Scope to cut first** if time slips: Playwright e2e, by-wind-level view, revisions overlay, Heroku fallback, dark mode. | Defer all of these. **Keep** strict typing on `domain/` and the property tests on the as-of selection; those are the most valuable pieces. |
| 5.3 | 🟠 | **Observability is thin** (health check only). | Add structured JSON logs, request IDs, and a `/meta` freshness field. The tech lead will ask about this. |
| 5.4 | 🟠 | **Parallel-agent collisions.** Shared files (OpenAPI spec, shared components) are single points of conflict. | Keep file ownership strict as in the plan; only WP4 changes the contract; require CI green before merge. |
| 5.5 | 🟡 | **Demo fragility.** The live deployed URL is the demo. | Record against the final deployment, keep a backup recording, and test in incognito. |

---

## 6. What holds up (keep)

- **Snapshot-first, stateless serving** removes the biggest runtime risk: the demo cannot fail because Elexon is down, and tests are deterministic.
- **As-of selection isolated in pure logic with property tests**, which is the correct place to concentrate rigor.
- **Explicit leakage rule** (expanding-window quantiles) for the risk band.
- **Contract-first typing** (OpenAPI → TypeScript) keeps parallel agents aligned.
- **Fixed sign convention and nMAE over MAPE** avoid common metric mistakes.
- **Honest trade-off statement** on Vercel vs Docker.

---

## 7. Changes to apply to `ARCHITECTURE_PLAN.md`

- [ ] WP0: add checks for publication/availability lag, actuals revision, row counts and vintages per target, Parquet size, Elexon request limits, and data-licence terms.
- [ ] WP1: add a dependency-size measurement on a deployed Vercel function; decide pandas vs polars vs DuckDB from the measurement.
- [ ] §4: add `availability_lag_minutes` to the as-of selection; add bootstrap confidence intervals and effective-sample-size reporting; make the risk margin level- or horizon-dependent.
- [ ] §3: introduce a repository interface between storage and domain logic.
- [ ] §5 (API): add input caps, `Cache-Control`/`ETag`, and precomputed default results.
- [ ] §3.3 / CI: add dependency auditing, Dependabot, image scanning, security headers.
- [ ] Manifest: record fetch time and dataset version; verify checksums on load.
- [ ] README / Method page: data-licence attribution, availability-lag assumption, actuals-as-of caveat, no-auth caveat.
- [ ] §8: add explicit time for video recording and submission; mark deferrable scope.
- [ ] Add structured logging and request IDs.

---

## 8. Open questions for the product manager / tech lead

1. Is the 09:00 London cutoff acceptable, or is there a prescribed gate-closure time?
2. Is it acceptable to commit Elexon data to a public repo under the BMRS licence, or should the repo ship tooling plus a small sample?
3. Should "decisions made in January 2026" mean decision days in January (delivery 2 Jan–1 Feb), as assumed?
4. Is a non-authenticated public demo acceptable for submission?
