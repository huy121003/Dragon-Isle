# iOS packaging status

## What this change prepares

- Capacitor configuration points to Vite's `dist` output.
- Native builds use relative asset paths so bundled files can be loaded from the app's local WebView.
- GitHub Actions can compile an iOS Simulator build on a macOS runner and upload it as a short-lived artifact.

## Important: this is not yet a fully offline game or an installable iPhone IPA

The current game still depends on the Node.js server for authentication and saves. For example, the login flow calls `/api/auth/login`, `/api/auth/register`, and `/api/auth/me`; save loading/writing calls `/api/save`. Arena/challenge and other account/session flows also use server APIs.

Packaging the frontend in Capacitor only bundles the client files. It does not bundle or replace the Node.js backend, and the simulator artifact from the workflow cannot be installed on a physical iPhone.

To achieve the requested offline experience, a separate offline-mode implementation is needed: local profile creation, local save/load and migration, and explicit handling/removal of features that require authoritative server state. To install on a physical iPhone, the app must also be signed with a suitable Apple development/distribution identity and provisioning profile (or distributed through TestFlight).

No Apple signing credentials should be committed to this repository. They must be configured as protected GitHub Actions secrets if a signed build workflow is added.


## Offline build behavior in this branch

The native build flag is injected only when `VITE_NATIVE_BUILD=true`. In that build:
- the game opens a local player profile without server login;
- game state is read from and written to local storage on the device;
- server-backed Arena, Challenge, and Daily Missions are hidden or guarded because they require authoritative server APIs.

This is an offline-capable core-game packaging step, not a verified claim that every feature works offline. More API dependencies must be tested on the simulator/device. The GitHub Actions workflow currently creates an iOS Simulator app artifact, not a signed physical-device IPA.
