<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Habitool

Habit tracker with local storage + Convex sync (Google sign-in).

## Prerequisites

- Node.js 20+
- Convex account/project

## Run Locally

1. Install dependencies:
   `npm install`
2. Set frontend env in `.env.local`:
   `VITE_CONVEX_URL="https://<your-dev-deployment>.convex.cloud"`
3. Start Convex dev (in a separate terminal):
   `npx convex dev`
4. Run the app:
   `npm run dev`

## Convex Auth Environment (Backend)

Set these in Convex deployment settings (dev and prod as needed):
- `SITE_URL` (your web app origin, e.g. `https://<user>.github.io/<repo>`)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

If Google sign-in redirects to `localhost` in production, check your Convex **production** environment values:
- `SITE_URL` must be your live web origin (not `http://localhost:3000`)
- `APP_URL` can also be set as a fallback origin

## Mobile App (Capacitor)

This project is configured with Capacitor.

1. Build and sync native projects:
   `npm run cap:sync`
2. Android:
   `npm run android:run:debug`
3. iOS (macOS + Xcode):
   `npm run cap:open:ios`

### Use Convex Prod in Mobile Builds

Use the `:prod` scripts so mobile bundles point to Convex production:

- Sync both platforms with prod URL:
  `npm run cap:sync:prod`
- Android with prod URL:
  `npm run cap:android:prod`
- iOS with prod URL:
  `npm run cap:ios:prod`

Current prod URL baked by these scripts:
`https://accurate-aardvark-130.convex.cloud`

Important: use `cap:*` scripts (or `build:mobile*`) for mobile builds. They force `VITE_BASE_PATH=./` so Android/iOS WebView can load bundled assets correctly.

### Android CLI (No Android Studio)

Requires JDK 21 (preferred) or JDK 17. JDK 25 is not supported by this Gradle stack.

1. Check device:
   `npm run android:devices`
2. Build debug APK:
   `npm run android:build:debug`
3. Install APK:
   `npm run android:install:debug`
4. Launch app:
   `npm run android:launch`

Debug APK path:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Android Studio (Optional)

`npm run cap:open:android`

## Deploy Web App (GitHub Pages)

This repo deploys via `.github/workflows/deploy-pages.yml` on push to `main`.

Required GitHub configuration:
1. In `Settings -> Environments -> github-pages -> Secrets`, set:
   `VITE_CONVEX_URL=https://<your-prod-deployment>.convex.cloud`
2. Ensure Pages is configured to use GitHub Actions.
3. Push to `main` (or run the workflow manually).

Note: no GitHub Actions workflow changes are required for Capacitor mobile builds. Mobile builds use your local `npm run cap:*` commands.

## Email Allowlist (DB-backed)

Allowlist is enforced in Convex before session creation.

Deploy backend changes to prod:
`npx convex deploy -y`

List:
- Dev: `npm run allowlist:list:dev`
- Prod: `npm run allowlist:list:prod`

Grant access:
- Dev: `npm run allowlist:grant:dev -- '{"email":"user@example.com","role":"user"}'`
- Prod: `npm run allowlist:grant:prod -- '{"email":"user@example.com","role":"user"}'`

Promote/demote role:
- Dev: `npm run allowlist:role:dev -- '{"email":"user@example.com","role":"admin"}'`
- Prod: `npm run allowlist:role:prod -- '{"email":"user@example.com","role":"admin"}'`

Revoke access:
- Dev: `npm run allowlist:revoke:dev -- '{"email":"user@example.com"}'`
- Prod: `npm run allowlist:revoke:prod -- '{"email":"user@example.com"}'`

Bootstrap first admin in prod:
`npm run allowlist:grant:prod -- '{"email":"you@example.com","role":"admin"}'`

## Notes

- Web app uses Google sign-in with Convex.
- Android app supports Google sign-in via system browser + deep link (`habitool://auth`) for Convex sync.
