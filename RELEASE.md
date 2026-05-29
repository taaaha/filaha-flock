# Releasing & updating Filaha Flock

This app updates users **without** asking them to manually download an APK or
uninstall the old version. There are two lanes:

| Lane | Carries | How the user gets it | When to use |
| --- | --- | --- | --- |
| **OTA** (expo-updates) | JS, content, styles, bug fixes | Silently on next app launch — no prompt, no download UI | Any change that does **not** touch native code, permissions, or the native parts of `app.json` |
| **APK** (self-installer) | Everything, incl. native code | In-app **Update** banner/button → downloads → installs in place | Native module changes, new permissions, SDK/dependency bumps, anything OTA can't carry |

> Rule of thumb: **APK is the source of truth** (it contains the whole app). OTA
> only patches the JS running on top of the current native shell. When in doubt,
> ship an APK.

---

## One-time setup

Do these once before the first release.

1. **Add the Expo token secret.**
   GitHub repo → *Settings → Secrets and variables → Actions → New repository secret*
   - Name: `EXPO_TOKEN`
   - Value: an Expo access token from <https://expo.dev> → *Account → Settings → Access tokens*

2. **Point the in-app updater at your `version.json`.**
   The app fetches a manifest to know when an APK update exists. Set the URL one
   of two ways:
   - **Edit source** — `src/services/UpdateService.js`, replace `<OWNER>/<REPO>`:
     ```js
     export const VERSION_MANIFEST_URL =
       'https://raw.githubusercontent.com/<OWNER>/<REPO>/master/version.json';
     ```
   - **Or override without touching code** — add to `app.json`:
     ```json
     "expo": { "extra": { "versionManifestUrl": "https://raw.githubusercontent.com/<OWNER>/<REPO>/master/version.json" } }
     ```
   The branch in the URL **must** be `master` (that's where CI commits `version.json`).

3. **Link the EAS Update channel to a branch** (once):
   ```bash
   eas channel:edit production --branch production
   ```
   Both build profiles (`production`, `production-apk`) ship on the `production`
   channel, and the OTA workflow publishes to the `production` branch.

> `runtimeVersion` policy is `appVersion`, so an OTA only reaches installs whose
> `expo.version` matches the one set when the OTA was published. That's why each
> APK version gets its own OTA lane — exactly what you want.

---

## Shipping a JS-only change (OTA)

**Do not bump the version.** Just get the JS onto `master`:

- **Automatic:** push to `master` touching any of `src/**`, `App.js`, `index.js`,
  `assets/**` → `ota-update.yml` runs `eas update` to the `production` branch.
- **Manual:** Actions → *OTA Update (expo-updates)* → *Run workflow* (optionally
  type an update message).

Users pick it up on their next launch. Nothing else to do.

> Native dirs are deliberately **excluded** from the auto-trigger so an accidental
> native change can never ship as an OTA (it would crash on old shells). Native
> changes must go out as an APK.

---

## Shipping a native change (APK)

This is the full release path. Three clicks:

1. **Actions → *Bump Version* → Run workflow.**
   Choose `patch` / `minor` / `major` and paste the changelog.
   It edits `app.json` (`expo.version` + `android.versionCode`), commits to
   `master`, and opens a **draft** GitHub Release `v<version>`.

2. **Review the draft.** Releases → `v<version>` → check the notes (they become
   the `version.json` "What's new" text, shown in the app in ar/fr/en).

3. **Publish release.** This is the trigger. `release-apk.yml` then:
   - builds a **signed** APK on EAS (`production-apk` profile),
   - attaches `filaha-flock-<version>.apk` to the release,
   - regenerates `version.json` from `app.json` + the release body,
   - commits `version.json` to `master`.

Within ~3 hours (manifest cache TTL) — or instantly if the user taps **Check for
updates** in Settings — every device sees the **Update** banner, downloads, and
installs in place. Same package (`com.filaha`) + same signing key ⇒ no uninstall.

> **Why a draft instead of auto-publishing?** Releases created by the built-in
> `GITHUB_TOKEN` don't trigger other workflows (GitHub's anti-recursion rule).
> Publishing the draft yourself is a human action, so it fires `release-apk.yml`.

### Manual fallback
You can skip *Bump Version* and edit `app.json` by hand (bump `expo.version` **and**
`android.versionCode`), commit, then create a Release tagged `v<version>`. Same result.

---

## Forcing an update (mandatory)

Edit `version.json` on `master` after it's published:

- `"mandatory": true` — the in-app dialog can't be dismissed until the user updates.
- `"minSupportedVersionCode": N` — any install with `versionCode < N` is forced to
  update. Use this to retire builds with a critical bug.

Both take effect on the next manifest fetch (≤3 h, or immediately on manual check).

---

## Rollback

- **OTA:** `eas update:rollback --branch production` (or publish a new OTA that
  reverts the JS). Effective on next launch.
- **APK:** Android won't install a *lower* `versionCode` over a higher one. To undo
  a bad APK, ship a **new** release with a **higher** `versionCode` containing the
  fix. (Keep a known-good APK around so you can roll forward fast.)

---

## Signing — read this

- The `production-apk` profile uses **EAS-managed signing** (same keystore every
  build). That consistent key is what makes in-place updates work — never rotate it.
- The original `production` profile builds an **AAB for the Play Store**. Google
  **re-signs** Play uploads with its own key, so a Play-distributed build and a
  sideloaded `production-apk` build are **not** update-compatible with each other.
  Pick one distribution channel per user and stick with it; don't mix.

---

## How it looks in the app (for reference)

- **Settings → Updates:** shows the installed version + a **Check for updates** button.
- **Dashboard:** a tappable banner appears when an update is waiting.
- **Update dialog** (`UpdateHost`): version + size + "What's new", a progress bar
  while downloading, and a smart button (Update / Restart / Installing…). If Android
  blocks the install, it shows a "permission needed" message and routes the user to
  grant *Install unknown apps*.

App-side throttle: silent auto-checks run at most every 6 h; the manifest is cached
for 3 h. Manual checks always hit the network.

---

## Files involved

| File | Role |
| --- | --- |
| `.github/workflows/bump-version.yml` | Bumps `app.json`, opens the draft release |
| `.github/workflows/release-apk.yml` | Builds/attaches the signed APK, writes `version.json` |
| `.github/workflows/ota-update.yml` | Publishes JS-only OTA updates |
| `version.json` (on `master`) | The update manifest the app polls |
| `version.example.json` | Template showing the manifest shape |
| `src/services/UpdateService.js` | Update brains (OTA + APK download/install) |
| `src/contexts/UpdateContext.js` | App state: check / download / apply |
| `src/components/UpdateHost.js` | The banner + update dialog UI |
| `eas.json` → `production-apk` | The signed-APK build profile |
