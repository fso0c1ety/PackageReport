# Smart Manage update system

## Canonical versions

`package.json#version` is the canonical semantic application version used by
the web manifest, Electron and Android `versionName`. Android `versionCode` is
a separate monotonically increasing Play Store integer stored at
`package.json#smartManage.androidVersionCode`; release automation may override
it with `SMART_MANAGE_ANDROID_VERSION_CODE`.

Do not use a build timestamp as an application version. Vercel commit SHA is
the public web build identifier and contains no secret configuration.

## Controlled policy

`GET /api/app-version` normalizes server-only environment configuration. Each
native platform supports:

- `SMART_MANAGE_<PLATFORM>_LATEST_VERSION`
- `SMART_MANAGE_<PLATFORM>_MINIMUM_VERSION`
- `SMART_MANAGE_<PLATFORM>_UPDATE_TYPE` (`OPTIONAL`, `RECOMMENDED`, `REQUIRED`)
- `SMART_MANAGE_<PLATFORM>_RELEASE_NOTES`

Android and iOS additionally accept `SMART_MANAGE_<PLATFORM>_STORE_URL`.
Only HTTPS Google Play and Apple App Store hosts are accepted. Until a real
listing is configured, the mobile policy fails open and cannot block the app.
No store URL is invented and native apps never sideload executable packages.

## Windows releases

Electron checks only the official `fso0c1ety/PackageReport` GitHub Releases
feed. The release workflow is tag-driven for stable versions. Manual workflow
runs are restricted to prereleases so update acceptance cannot replace the
public stable release.

Every stable release must keep this exact asset name:

`Smart.Manage.zip`

The public landing link therefore remains stable:

`https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip`

Never set a required minimum version before the target stable release and its
updater metadata are verified. Code signing secrets belong only in GitHub
Actions secrets and must never be committed or exposed to the renderer.

## Safe acceptance

Test Windows installation and Restart & Update with a prerelease/test tag and
an isolated test installation. Do not publish a stable tag from a feature PR.
For web, verify the refresh prompt with two different build IDs and preserve
unsaved work by requiring an explicit Refresh click.
