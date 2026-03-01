<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://aistudio-preprod.corp.google.com/apps/cff20585-efd7-41eb-9589-432609a9256f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Mobile App (Capacitor)

This project is configured with Capacitor.

1. Build and sync native projects:
   `npm run cap:sync`
2. Android:
   `npm run android:run:debug`
3. iOS (macOS + Xcode):
   `npm run cap:open:ios`

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

### Notes

- Web app uses Google sign-in with Convex.
- Android app supports Google sign-in via system browser + deep link (`habitool://auth`) for Convex sync.
