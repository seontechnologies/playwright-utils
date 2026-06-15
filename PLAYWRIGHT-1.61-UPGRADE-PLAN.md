# Playwright 1.61 Upgrade & Feature Adoption Plan

> Status: Planning
> Author: (Murat)
> Created: 2026-06-15
> Current PW: peer `>=1.54.1` (`package.json:250`), dev `^1.59.0` (`package.json:268`)

## Goal

Upgrade to Playwright 1.61 and adopt two new capabilities that map directly onto existing utilities:

1. **auth-session** → adopt the new **WebStorage API** (`page.localStorage` / `page.sessionStorage`, 1.61) so auth works for **localStorage-based token apps**, not just cookie-based ones.
2. **network-recorder** → adopt the **native HAR hybrid** so recordings capture **WebSocket traffic** ("HAR & trace recordings now include WebSocket requests", 1.61).

The dep bump (#1 from the analysis) is trivial and rides along with the auth work.

## Branch / sequencing strategy

| Phase | Branch                            | Scope                                             | Why grouped                                                                     |
| ----- | --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| **A** | `feat/auth-session-localstorage`  | Dep bump + auth-session WebStorage                | Bump is a prerequisite; auth change is self-contained & low-risk                |
| **B** | `feat/network-recorder-ws-hybrid` | network-recorder native-HAR hybrid for WebSockets | Larger architectural change; isolate so it can bake / be reverted independently |

Do **A** first, ship it, then branch **B** off updated `main`.

---

## Phase A — Dep bump + auth-session localStorage support

### A0. Dependency bump (piggyback of analysis item #1)

- [x] `package.json` devDependency `@playwright/test`: `^1.59.0` → `^1.61.0` (installed 1.61.0, `npx playwright install` for new browser binaries)
- [x] `npm run validate` (typecheck, lint, test, format) — **green on 1.61 with no source changes** (backend Jest + 24 frontend vitest pass; lint/typecheck/prettier clean).
- [ ] **Peer floor decision:** `page.localStorage` exists only in 1.61. If Phase A ships code that calls it, bump peer `@playwright/test` to `>=1.61.0`. To avoid forcing all consumers up, the localStorage path will be **opt-in/feature-detected** (see A4) — keep peer at `>=1.54.1` if feasible, otherwise raise floor and release as a **minor**.

### Current state (what's cookie-only today)

- `defaultTokenFormatter` (`src/auth-session/internal/auth-session.ts:168-216`) emits `{ cookies: [...], origins: [] }` — **`origins` is always empty**, so localStorage is never populated.
- `applyUserCookiesToBrowserContext` (`src/auth-session/apply-user-cookies-to-browser-context.ts:18-63`) only calls `context.addCookies()`.
- `AuthProvider.extractCookies()` (`src/auth-session/internal/auth-provider.ts:41-50`) is the only browser-state extraction hook — there's no localStorage equivalent.

### Design

Provider pattern stays the source of truth. Add an **optional**, **non-breaking** localStorage path parallel to cookies.

- [x] **A1. Extend `AuthProvider` interface** (`src/auth-session/internal/auth-provider.ts`): added **optional** `extractStorage?(tokenData)` returning `Array<{ origin; localStorage: Array<{name,value}> }>`. Cookie-only providers untouched.
- [x] **A2. New util file** `src/auth-session/apply-user-storage.ts`, exporting two helpers (exported from `index.ts`): - `applyUserStorageToBrowserContext(context, tokenData)` — seeds via `context.addInitScript`, origin-guarded, version-agnostic. - `applyUserStorageToPage(page, tokenData)` — uses 1.61 `page.localStorage` (see A4).
- [x] **A3. `defaultTokenFormatter` populates `origins`** from `provider.extractStorage` when present (`auth-session.ts`, new `extractOriginsFromProvider` helper); empty array otherwise → cookie path unchanged.
- [x] **A4. Feature detection:** `applyUserStorageToPage` feature-detects `page.localStorage.setItem`; falls back to `page.evaluate` on `<1.61`. **Peer floor stays `>=1.54.1` — not raised.** (Confirmed at runtime: log shows "via page.localStorage (1.61)".)
- [x] **A5. Sample app provider:** added `extractStorage` to `playwright/support/auth/token/extract.ts` and wired into `myCustomProvider` — same JWT exposed as a localStorage entry for the app origin.
- [x] **A6. Tests:** `playwright/tests/auth-session/auth-session-localstorage.spec.ts` — 3 tests: context seeding, page-level 1.61 WebStorage write/read, and cookie+localStorage coexistence (non-breaking). All green.
- [x] **A7. Docs:** added "localStorage-Based Authentication" subsection + ToC entry to `docs/auth-session.md` with provider hook, both helpers, peer-version note, and a link to the runnable spec.

### Acceptance criteria (Phase A)

- [x] `npm run validate` green on PW 1.61 (typecheck, lint, 45 backend + 24 frontend unit, format, exports-parity).
- [x] Existing cookie-based auth path **unchanged** (full auth-session suite + 150-test PW suite green; only the pre-existing webhook/Kafka-timing flake, which passes on retry).
- [x] A localStorage token lands in browser storage with no UI login (proven by the new spec, both context- and page-level).
- [x] **Peer floor NOT raised** — kept at `>=1.54.1` via feature detection. Document this in the PR.

> ⚠️ **Test-env note:** never run `npm run validate`/`npm run test:backend` while `start:sample-app` is live — backend Jest runs `prisma db push --force-reset` against the **shared** `dev.db`, corrupting the running server (POST /movies → 500, then read-only-DB errors after the global-teardown "Database restored" step). Run unit tests and the PW suite separately, and restart the sample app between PW runs if the backend starts 500ing.

### Post-review fixes (Codex + cursor-agent + antigravity)

Three independent LLM reviews were run. Resolutions:

- **[Blocker — Codex] Persisted origins were never populated on the real path.** `provider.manageAuthToken()` returns a storage state that's JSON-stringified and re-formatted; `defaultTokenFormatter` early-returned on storage-state input, skipping origin augmentation, so the saved file kept `origins: []`. **Fixed:** augment origins on all three formatter return paths via `applyProviderOriginsToState` + idempotent `mergeStorageOrigins`, and in `getAuthToken` before save/return (`core.ts`). Verified: `.auth/local/admin/storage-state.json` now persists the localStorage `origins` entry. (Note: cursor-agent and antigravity both missed this; only Codex caught it.)
- **[SF] extractStorage error handling** — distinguishes "no provider" (silent, by contract) from a user hook that throws (now `log.warningSync`, non-fatal); short-circuits non-object token data.
- **[SF] localStorage fallback path untested** — added a PW test that nulls `page.localStorage` to force and assert the `page.evaluate` fallback.
- **[SF] "non-breaking" / formatter not directly tested** — new `auth-session-formatter.spec.ts` proves no-provider/no-hook/throwing → `origins: []`, and population across all three formatter input shapes (object, storage-state object, JSON string) using a stub provider with set/restore isolation.
- **[SF — antigravity] origin normalization** — `normalizeOrigin()` handles trailing slash / full-URL origins in both helpers and inline in the init script.
- **[SF — antigravity] SecurityError safety** — init script wraps `localStorage.setItem` in try/catch so storage-disabled/sandboxed frames can't break page load.
- **[SF — antigravity] file symmetry** — split into `apply-user-storage-to-browser-context.ts` + `apply-user-storage-to-page.ts` + shared `internal/extract-storage-origins.ts`, matching the cookie sibling convention.
- **[SF/Nit] logging parity** — nested try/catch separating extraction vs application errors.
- **[Nit] sessionStorage overclaim** — removed from JSDoc, helper headers, and docs (localStorage-only by design; PW storage state has no sessionStorage).
- **[Nit] tautological page test** — now asserts via both `page.localStorage` and an independent `page.evaluate`.
- **[Nit — declined per user] root Jest wiring** — all three flagged the orphaned `src/*.test.ts` Jest tests. Deliberately **not** wired up (user opted out of Jest); the equivalent coverage lives in the two Playwright specs above instead.

Final verification after fixes: typecheck + lint clean; `npm run validate` green; full PW suite **152 passed, 3 flaky** (2 network-recorder HAR-timing + 1 webhook/Kafka, all pass on retry); 11/11 auth-session specs green.

---

## Phase B — network-recorder native-HAR hybrid (WebSocket support)

### Current state & the gap

- Recording rolls its **own** HAR via `context.route('**/*')` + `route.fetch()` (`src/network-recorder/core/network-recorder.ts:210-275`), then writes HAR at cleanup (`:151-174`).
- `context.route` is **HTTP-only** → **WebSocket traffic is silently dropped** from recordings. No warning is emitted today.
- The custom-HAR approach is deliberate: it enables stateful-CRUD detection (`:337-363`), URL mapping, and entry-cycling playback (`har-playback-handler.ts`). Native `routeFromHAR` can't do those.

### Strategy: hybrid, not replacement

Keep the custom playback engine (stateful CRUD + URL mapping). Change the **record** side so WebSockets are captured natively, while HTTP entries still feed the existing stateful pipeline.

- [ ] **B0. (Cheap, do regardless) Document the WS limitation** in network-recorder README so current behavior is honest even before the hybrid lands.
- [ ] **B1. Spike:** evaluate two capture approaches on PW 1.61: - (a) `recordHar` context option / `tracing.startHar()` (1.60) which now includes WebSockets — produces a native HAR with WS entries. - (b) Keep `context.route` for HTTP + add WS capture, merge into one HAR.
      Decide based on whether native HAR's WS entries are sufficient for playback fidelity.
- [ ] **B2. Record path:** capture via native HAR (WS included) **alongside** the existing HTTP entry building, OR merge native WS entries into `this.harData` before write (`network-recorder.ts:151-174`). Preserve current HAR schema consumed by `har-playback-handler.ts`.
- [ ] **B3. Playback path:** extend playback to replay WS frames where present. (Native `routeFromHAR` may help for WS; HTTP stays on the custom stateful engine.) Investigate Playwright `webSocketRoute` APIs for replay.
- [ ] **B4. Mode/config:** keep `PW_NET_MODE=record|playback|disabled` semantics. Add config flag if WS capture needs to be opt-in.
- [ ] **B5. Peer floor:** WS-in-HAR requires 1.61 on the **record** side → if shipped, bump peer `@playwright/test` to `>=1.61.0` and release as a **minor** (document clearly).
- [ ] **B6. Sample app:** add a WebSocket-using feature in `sample-app/` (or use Kafka/event path) so record+playback of WS is exercised end to end.
- [ ] **B7. Tests:** - Record a flow with WS traffic → HAR contains WS entries. - Playback that HAR → WS-dependent UI behaves without a live server. - Existing HTTP/stateful-CRUD playback tests still pass (regression guard).
- [ ] **B8. Docs:** update README — WS now supported, peer requirement, hybrid architecture note.

### Acceptance criteria (Phase B)

- A WS-using flow records to HAR **with** WebSocket entries and plays back offline.
- Existing HTTP recording + stateful-CRUD playback unchanged (full regression suite green).
- `PW_NET_MODE` semantics preserved.
- Peer floor + minor-version bump documented.

---

## Risks & notes

- **Peer floor is the main consumer-facing decision.** Prefer feature-detection in Phase A to avoid forcing the bump; Phase B almost certainly forces `>=1.61.0` (release as minor).
- Phase B is the larger refactor — keep it on its own branch so it can bake / revert without blocking Phase A.
- No flaky tests / no hard waits: WS playback tests must use event/polling-based waits (use `recurse`), never sleeps.
- Both phases must keep existing public APIs backward compatible; new capabilities are additive and opt-in.

## Out of scope

- WebAuthn passkeys (1.61) — potential _future_ standalone utility, not part of this work.
- `apiResponse.securityDetails()` / `serverAddr()` (1.61) — minor api-request nicety; track separately if wanted.
