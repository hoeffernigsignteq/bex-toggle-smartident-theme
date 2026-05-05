# SmartIdent Branding Toggle Extension

<img src="./assets/icons/toolbar-on.svg" width="96" alt="SmartIdent Branding Toggle ON icon" />

Browser extension for Chrome and Firefox that toggles SmartIdent custom branding styles in the active tab.

This is designed to quickly switch to the default Signteq theme when needed, e.g. to capture a screenshot of a bug with the default theme, and afterwards toggle branding back on.

## Features

- Toggle branding via toolbar icon click or keyboard shortcut (`Alt/Option+Shift+S`).
- Options page shows the active shortcut and links to browser shortcut settings.
- Firefox-only extension context menu includes an `Options` entry for faster access.
- Icon state (ON/OFF/indeterminate) and error badge state (`ERR`) auto-refresh on tab activation and page load.
- Disables `#smartident-branding-css`, typography and focus-ring branding style elements, and inline `<html>` `--color-*` variables.
- Current-tab-only behavior (no persistent per-tab state).
- Runtime allowlist enforcement (editable in extension Options page).

## Install from GitHub Releases

Open this repository's **Releases** page and download the correct asset for your browser.

Use these files:

- `bex-toggle-smartident-theme-<version>-chrome.zip`: Chrome install package
- `bex-toggle-smartident-theme-<version>-firefox.zip`: Firefox unsigned install package

### Chrome (Persistent Install from Release Asset)

1. Download `bex-toggle-smartident-theme-<version>-chrome.zip` from the release.
2. Extract the zip to a local folder.
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the extracted folder that contains `manifest.json`.

### Firefox (Persistent Unsigned Install - Dev Channels Only)

> Unsigned persistent install is only possible on Firefox channels/builds that allow disabling
> signature enforcement.
>
> Dev channels/builds in this context mean:
>
> - Firefox Developer Edition
> - Firefox Nightly
> - Firefox ESR
> - Zen Browser (Firefox fork)
>
> Regular Firefox Stable does not support persistent unsigned extension installation.

1. Download `bex-toggle-smartident-theme-<version>-firefox.zip` from the release.
2. Open `about:config`
3. Set `xpinstall.signatures.required` to `false`
4. Open `about:addons`
5. Click the gear icon -> **Install Add-on From File...**
6. Select the downloaded Firefox package.
7. If Firefox rejects `.zip`, rename it to `.xpi` and retry install.

## Local Development

1. Install dependencies:
- `npm install`
2. Start watch/dev build for a target browser:
- `npm run dev:chrome`
- `npm run dev:firefox`
3. Load the generated unpacked extension from `.output/<target>-dev/`:
- Chrome: `chrome://extensions` -> **Load unpacked** -> select `.output/chrome-mv3-dev`
- Firefox: `about:debugging#/runtime/this-firefox` -> **Load Temporary Add-on** -> select `.output/firefox-mv2-dev/manifest.json`
4. After code changes:
- Chrome: click **Reload** on the extension card.
- Firefox: click **Reload** in `about:debugging` for the temporary add-on.

## Publishing a New Version (GitHub Releases)

Use this process whenever extension behavior changes and you want new install artifacts for the team.

1. Bump `"version"` in `package.json` (for example `1.0.0` -> `1.0.1`).
2. Run `npm install` if dependencies changed.
3. If icon source SVGs changed and you run only a single-target build, regenerate icons manually:
- `npm run icons:generate`
4. Verify everything:
- `npm run compile`
- `npm run test`
- `npm run build`
- `npm audit`
5. Push your commit(s) to `main`.
6. Create and push a release tag:
- `git tag v<version>`
- `git push origin v<version>`
7. GitHub Actions will create the release automatically from the tag and upload:
- `.output/bex-toggle-smartident-theme-<version>-chrome.zip`
- `.output/bex-toggle-smartident-theme-<version>-firefox.zip`
- If automation is unavailable, create the release manually on GitHub for `v<version>` and upload both files.

## Security Notes

- Manifest-level host access is restricted to:
  - `https://verify.smartident.io/*`
  - `https://verify.smartident.live/*`
  - `https://verify.smartident.dev/*`
  - `https://localhost/*`
- Actual toggle execution is gated by runtime allowlist checks (`allowedMatchPatterns`).
- Keep `allowedMatchPatterns` minimal and explicit for your environments.
- No remote script fetching, no eval usage, and no outbound network requests are implemented in extension code.

## Functional Limits

- This toggle restores SmartIdent branding styles and inline `<html>` `--color-*` variables only.
- Branding baked into content assets (for example Lottie animations) is not reverted.

## Defaults

Default allowlist patterns:

- `https://verify.smartident.io/*`
- `https://verify.smartident.live/*`
- `https://verify.smartident.dev/*`
- `https://localhost:5173/*`

## Scripts

- `npm run dev` - Start WXT dev mode (default browser target)
- `npm run dev:chrome` - Start dev mode for Chrome
- `npm run dev:firefox` - Start dev mode for Firefox
- `npm run build` - Generate icons, then build production output for Chrome and Firefox
- `npm run build:chrome` - Build Chrome output only (does not auto-regenerate icons)
- `npm run build:firefox` - Build Firefox output only (does not auto-regenerate icons)
- `npm run zip` - Build + zip default browser output
- `npm run zip:chrome` - Build + zip Chrome output
- `npm run zip:firefox` - Build + zip Firefox output
- `npm run icons:generate` - Generate PNG icon assets from source SVGs
- `npm run compile` - Type-check with `vue-tsc`
- `npm run test` - Run test suite once
- `npm run test:watch` - Run tests in watch mode

## Tech Stack

- [WXT](https://wxt.dev)
- Vue 3
- TypeScript
- Vitest

## Testing

Run:

- `npm run test`

Coverage includes:

- allowlist validation and URL matching
- branding style toggle behavior for SmartIdent CSS, typography, and focus-ring elements
- background orchestration logic for icon click and command paths

## Release Checklist

- [ ] Version bumped in `package.json`
- [ ] Icons regenerated (if icon SVGs changed, via `npm run build` or `npm run icons:generate`)
- [ ] `npm run compile` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm audit` reports no vulnerabilities
- [ ] `npm run zip:chrome` created release zip
- [ ] `npm run zip:firefox` created release zip
- [ ] Commit(s) pushed to `main`
- [ ] Tag `v<version>` pushed (`git push origin v<version>`)
- [ ] GitHub Release published with both browser zips
