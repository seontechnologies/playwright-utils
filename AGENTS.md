# Repository Guidelines

## Project Structure & Module Organization

Core TypeScript utilities live in `src/`, grouped by feature folders such as `api-request`, `intercept-network-call`, and `log`. Build outputs land in `dist/`; regenerate them via `npm run build` instead of editing. Docs stay in `docs/`, and Playwright specs, fixtures, and config live in `playwright/`. The `sample-app/{backend,frontend}` workspace powers demo flows, `scripts/` holds automation helpers, and transient outputs (`playwright-report/`, `test-results/`, `har-files/`) should remain untracked.

## Build, Test, and Development Commands

- `npm run build`: clean + emit CJS, ESM, and type outputs into `dist/`.
- `npm run validate`: parallel type-check, lint, unit tests, and formatting to catch regressions fast.
- `npm run test`: executes `sample-app` backend Jest suite and frontend Vitest suite.
- `npm run test:pw` / `npm run test:pw-ui`: run Playwright specs headless or in UI mode against `TEST_ENV=local`.
- `npm run test:pw:burn-in`: repeats flaky suites (`PW_BURN_IN=true`) before promoting changes.
- `npm run start:sample-app`: boots backend + frontend so local playwright runs hit real services.

## Coding Style & Naming Conventions

Source targets Node 18+, so use 2-space indentation, trailing commas, and ES module syntax. Prefer named exports and keep file names kebab-case to satisfy `eslint-plugin-filenames`. Run `npm run fix:format` (Prettier + ESLint) before pushing, and store fixtures beside their modules (for example `src/api-request/fixtures.ts`).

## Testing Guidelines

Author unit or component tests beside the code they verify, mirroring the `*.spec.ts` naming pattern in `sample-app`. Integration flows belong in `playwright/tests`; tag cases that hit external services and capture HTML reporter output when failures occur. Run `npm run validate` plus the needed Playwright command before every PR, and use `npm run test:pw:burn-in` for flaky or high-traffic fixtures.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`) with subjects ≤72 characters and keep each commit focused. Include updated HAR/log assets whenever behavior shifts. PRs must link an issue, summarize the change, list validation steps, and attach screenshots or console output for UI/test updates; rerun `npm run validate` after rebases and note any skipped checks.

## Security & Configuration Tips

Never commit `.env` values or Playwright storage states; rely on `TEST_ENV` and document defaults in `docs/`. Run `setup-playwright-browsers` after fresh installs for consistent binaries. Dry-run releases with `npm run publish:local` before tagging to confirm artifacts and registry scopes.
