# GitHub Web Publication Implementation Plan

> **For agentic workers:** Use subagent-driven-development. New isolated checkout; original prototype remains intact.

**Goal:** Publish existing travel app at a fixed GitHub Pages URL with durable multiplayer cloud API.

**Architecture:** GitHub Pages static export + Sites Vinext API + D1. Reuse candidate/domain and existing gesture controller. Public frontend has only API URL config, no backend secrets.

**Tech Stack:** Node 24, ES modules, GitHub CLI/Pages, supplied Sites Vinext starter, D1, existing Playwright/Edge verification.

## Global constraints

Preserve all current flows, uniform candidate selection and same-round unique result. Static assets and invitations must work at `/suixing-chufa/`. No credentials in source/history/log output. Public ID is not an authentication credential; private token is never returned in room data. Persist room state with revision compare-and-swap. Document sample data and browser-local collections honestly.

### Task 1 — Durable cloud API (backend agent)

Own: `prototype/domain.mjs` persistence bridge; `server/cloud-api.mjs`; `db/schema.ts`; `app/api/[...path]/route.ts`; `tests/cloud-api.test.mjs`; domain persistence tests.

Interfaces:
- Add `RoomStore.exportRecord(code)` -> clone `{room,drawVersion}`; `RoomStore.importRecord(record)` -> import trusted DB record into fresh store. Keep original domain methods/errors.
- Export `handleApi(request, db, {allowedOrigins=[]}={})` -> Response. `db` is D1 interface `prepare(sql).bind(...).first()/run()`; tests may implement with real Node sqlite wrapper.
- Same endpoints and JSON contracts as prototype/server. New GET `/api/health` reports service readiness. CORS allows configured origins plus own origin; validate OPTIONS headers, no wildcard for public service.
- Header `x-travel-client` UUID/public ID; `x-travel-token` 64 lowercase hex chars private secret. Hash token, insert-or-verify `travel_clients(client_id,token_hash)` for identity-bearing requests. Never return token/hash. Reject wrong token for existing ID with403.
- `travel_rooms(code TEXT PRIMARY KEY, revision INTEGER NOT NULL, record TEXT NOT NULL, updated_at INTEGER NOT NULL)`. Creation insert uniqueness retry; modifications load, mutate via RoomStore, CAS by revision; bounded retry reloads authoritative record. Ready does not increment domain version, so separate revision is essential. Deletes on final leave only through CAS. Idempotent draw survives fresh handler/store instance.
- Schema-only Drizzle definitions; root generates migration and configures D1.
- Route imports `env` from `cloudflare:workers` and passes `env.DB`, origins including `https://wenzo-zwz.github.io`; no authentication UI or dependency on ChatGPT for visitors.

- [x] Write meaningful failing SQLite-backed tests for persistence/new instance, concurrency/CAS, same round draw, spoofing and CORS/body limits. Run red.
- [x] Implement bridge/API/schema/route. Run target tests green and report. Do not edit root config/package or frontend.

### Task 2 — Browser website and Pages export (frontend agent)

Own: `prototype/app.mjs`, `prototype/render.mjs`, `prototype/styles.css`, `prototype/index.html`, `prototype/runtime-config.mjs`, `scripts/build-pages.mjs`, `tests/pages-build.test.mjs`; copy selected avatar to prototype assets.

Interfaces:
- Runtime config default export `{apiBase:''}` for local same-origin prototype; build output rewrites config with explicit HTTPS cloud API origin via `node scripts/build-pages.mjs --api-base https://...`.
- app imports config, prefixes API paths, stores private `clientToken` (64 lowercase hex from two UUIDs) in existing storage without exposing in render state output/room. Send `x-travel-token` alongside clientId.
- Invitations construct URL from current pathname, reset query/hash, then room query; preserve GitHub project subpath. Same browser stored identity semantics remain.
- Build exact static allowlist into `dist-pages/` (no server files, private config, tests or operational docs); include `.nojekyll`, icon/manifest as needed. Existing style/brand retained, replace fake mobile clock/capsule with real web header and approved paper-plane traveler avatar. Do not change four-gesture thresholds.
- [x] Write failing build/subpath/secret-exclusion tests.
- [x] Implement, validate targeted tests and browser-visible DOM; report. Do not edit backend or root package/config.

### Task 3 — Provisioning, integration and release (root)

- [x] Set up isolated supplied Sites project and dependencies. Configure D1 binding `DB`, persist native returned Site ID unchanged, obtain public audience for anonymous API as user requested anytime web access.
- [x] Generate schema migration, apply locally, run tests and preview. Run existing rule/HTTP/gesture/room UI regressions; adapt only assertions tied to replaced web chrome.
- [x] Build Sites via native source helper, commit/push exact source to its remote, package same commit, save version, deploy, check status. Verify anonymous API and independent-member group flow over HTTPS.
- [x] Build Pages with verified API origin; local subpath and cross-origin full browser verification. Independent final review and fixes.
- [x] Create public `Wenzo-zwz/suixing-chufa`, push full source on main and static output on gh-pages; configure Pages branch through API (no Actions workflow permission needed). Wait for successful Pages build, inspect live mobile homepage, touch draw and group invitation.
- [x] Update README with fixed URLs, actual limits and update instructions; finish with verified site/repo links. No blanket uptime or mainland connectivity promises.

