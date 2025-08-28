# Project Guidelines

These guidelines capture project-specific knowledge to speed up development and reduce setup friction. They focus on the Angular frontend (folder: `frontend`) and any repo-wide practices observable from the codebase. Update this document as the project evolves.

## 1) Build and Configuration

- Toolchain
  - Angular CLI/Build: @angular/cli and @angular/build v20.x.
  - TypeScript: ~5.8.
  - Styling: Tailwind CSS v4 with tailwindcss-primeui plugin; PrimeNG v20 and PrimeIcons.
  - i18n: @ngx-translate (TranslateModule + Http loader) with assets under `src/assets` (e.g., `src/assets/languages.json`).

- Node/npm
  - Use an LTS Node version compatible with Angular 20 (>=18.19 or 20.x recommended). On CI/Windows PowerShell, prefer Node 20.

- Project name and targets
  - Angular project name: `a20` (see `frontend/angular.json`).
  - Application builder: `@angular/build:application` (standalone API, no NgModule).

- Build commands (from `frontend` directory)
  - Install deps: `npm ci` (or `npm install` for local dev).
  - Dev server: `npm start` (serves on http://localhost:4200 by default).
  - Production build: `npm run build` (outputs to `frontend/dist/a20/browser`).
  - Development build with watch: `npm run watch`.

- Assets and styles
  - Global styles: `src/styles.scss` uses Tailwind v4 primitives:
    - `@use "tailwindcss";` and `@plugin "tailwindcss-primeui";`.
  - Tailwind config: `frontend/tailwind.config.js` defines content globs, enables primeui plugin, and sets dark mode selector to `[class~="my-app-dark"]`.

- Environments
  - `src/environments/environment.ts` includes Firebase config and `backendUrl` (currently `http://localhost:3000`). Introduce `environment.prod.ts` if production overrides are needed (Angular CLI will respect `fileReplacements` if configured). As of now, the app uses a single environment file; confirm before relying on build-time replacements.

- Localization
  - Language data under `src/assets/languages.json`. `LanguageSelector` component integrates with ngx-translate; ensure translation files are present under `src/assets/i18n` if required by the loader configuration.

## 2) Testing

- Framework & runner
  - Jasmine 5.x + Karma 6.x via Angular CLI builder `@angular/build:karma`.
  - Karma config: `frontend/karma.conf.js`. Default browser is Chrome (headed). You can run headless via CLI option `--browsers=ChromeHeadless`.

- Commands (run inside `frontend`)
  - Single run, CI-friendly: `npm test -- --watch=false --browsers=ChromeHeadless`.
  - Default watch mode (headed Chrome): `npm test`.

- Existing tests
  - Component specs exist, e.g.:
    - `src/app/components/app/app.spec.ts`
    - `src/app/components/language-selector/language-selector.spec.ts`
  - Service spec example:
    - `src/app/services/avatar-service.spec.ts` (tests canvas-based avatar generation).

- Adding a new unit test (example procedure)
  1. Create a spec file next to the code under test, e.g., `src/app/util/string.util.spec.ts`:
     - Example code you can use for a quick sanity test:
       - Create a file `src/app/util/string.util.ts` with:
         export function titleCase(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s; }
       - Create a file `src/app/util/string.util.spec.ts` with:
         import { titleCase } from './string.util';
         describe('titleCase', () => {
           it('uppercases first letter', () => { expect(titleCase('chat')).toBe('Chat'); });
           it('handles empty string', () => { expect(titleCase('')).toBe(''); });
         });
  2. Run tests: `npm test -- --watch=false --browsers=ChromeHeadless`.
  3. Remove the example files after validating your setup to keep the repo clean.

- Notes for CI/Headless environments
  - Ensure Chrome/Chromium is available. On Windows CI, install a Chrome variant or use Playwright’s bundled Chromium and point Karma to it. By default, `karma-chrome-launcher` resolves installed Chrome.
  - If you see timeouts on CI, add `--no-progress --reporters=progress` and/or tweak Karma `captureTimeout`.

## 3) Additional Development Information

- Angular 20 Standalone
  - The app uses standalone components (e.g., `LanguageSelector`). Import components directly via `imports` in test and component bootstrapping, not via NgModules.

- PrimeNG + Tailwind
  - PrimeNG 20 integrates with Tailwind. Keep `tailwindcss-primeui` plugin registered (see `tailwind.config.js`) and ensure global styles include the plugin directive as already configured in `styles.scss`.
  - For dark mode, toggle the `my-app-dark` class on a root container to switch themes according to current config.

- Routing/Bootstrap
  - `src/app/app.config.ts` is used for application-level providers and routing setup. Prefer `provideRouter`/standalone patterns. Keep provider configuration centralized there.

- i18n
  - `@ngx-translate/core` is used. Tests often mock `TranslateService` (see existing specs). When writing tests that depend on translation keys, prefer mocking `TranslateService` or providing `HttpClientTestingModule` and `provideHttpClientTesting()` as in `language-selector.spec.ts`.

- Code Style
  - TypeScript strictness should align with Angular defaults. Follow Angular style guide for file naming (`kebab-case` for files, `.spec.ts` for tests).
  - Prefer pure functions for utilities and ensure services are easily testable.

- Backend integration
  - `environment.backendUrl` points to `http://localhost:3000`. When working with backend-dependent features, gate HTTP calls to allow `HttpClientTestingModule` and interceptors in tests.

- Build artifacts
  - Production builds land in `frontend/dist/a20/browser`. If prerendering/SSR is introduced later, expect additional outputs like `prerendered-routes.json`.

## 4) Quick Start (Windows/PowerShell)

From the repository root:
- Frontend
  - cd frontend
  - npm ci
  - npm start  # open http://localhost:4200
  - npm run build  # production build
  - npm test -- --watch=false --browsers=ChromeHeadless  # run unit tests in headless mode

## 5) Temporary Test Demonstration (how we validate locally)

To validate the testing pipeline without polluting the repo:
- Add the two example files shown in section 2 (string.util.ts and string.util.spec.ts).
- Run: `npm test -- --watch=false --browsers=ChromeHeadless`.
- Confirm the 2 passing specs.
- Delete both files afterwards.

Housekeeping: Remove any temporary test/demo files you create. Only commit meaningful tests tied to actual features.
