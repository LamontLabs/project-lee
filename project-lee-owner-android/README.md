# Project LEE Owner Android

Standalone Android repository for the Project LEE Owner companion.

## What is included

- Expo SDK 54 Owner client with the existing first-launch pairing flow.
- Checked-in native Android project for `com.projectlee.owner`.
- Native Android Share intake and foreground MediaProjection/Watch modules.
- Native notifications, SecureStore persistence, document/PDF intake, camera/image intake, audio capture, deep links, and offline capture queue.
- Only the shared mobile foundation, API client, and API contract packages required by Owner.
- Owner/shared contract checks and rendered navigation checks.
- GitHub Actions workflow that validates the Owner client, compiles the native project, and uploads `Project-LEE-Owner-Android-Test`.

LEE Family, the hosted Core/API server, the console, the manual, and desktop runtime are intentionally not part of this repository.

## Local development

Requirements:

- Node.js 22
- pnpm 10
- Java 17 or newer
- Android SDK platform 36, build-tools 36.0.0, and NDK 27.1.12297006

```bash
pnpm install
pnpm run typecheck
pnpm run test:owner
pnpm run android:debug
```

The debug build creates `android/app/debug.keystore` only when needed. It is ignored and is never committed. The resulting APK is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Actions

`.github/workflows/owner-android.yml` installs the JavaScript and Android toolchains, runs the Owner/shared checks, creates an ephemeral debug signing key, builds the checked-in native project, verifies the package identity, and uploads:

```text
Project-LEE-Owner-Android-Test
```

This workflow uses normal debug/test signing only. It does not use production signing credentials or publish a store release.

## Runtime boundaries

Pairing tokens and device credentials are entered or created at runtime and remain in OS-protected storage. No pairing token, Core credential, provider credential, CerbaSeal secret, database secret, session secret, or signing key is stored in this repository or APK source.

The current client preserves its `lee-android://` custom-scheme deep links. Strict HTTPS Android App Links and `assetlinks.json` are not added here because they are a separate capability from the existing app behavior.