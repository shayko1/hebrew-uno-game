# Build Guide — צבעוני! Native App

## Prerequisites

- **Node.js** 18+ and npm
- **Xcode** 15+ (for iOS) — Mac only
- **Android Studio** (for Android)
- **Apple Developer Account** ($99/year, for App Store submission)

## Setup

```bash
cd /path/to/hebrew-uno-game

# Install dependencies
npm install

# Sync web assets to native projects
npx cap sync
```

## iOS Build

```bash
# Add iOS platform (first time only)
npx cap add ios

# Sync web files
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select your team in **Signing & Capabilities**
2. Set **Bundle Identifier** to `com.tsivoni.game`
3. Set **Display Name** to `צבעוני!`
4. Go to **General > App Icons** and add the 1024x1024 icon
5. Select a real device or simulator
6. **Product > Archive** for App Store submission

### iOS App Icons

Xcode requires specific icon sizes. Use the 1024x1024 icon from `icons/icon-1024.png`.
In Xcode 15+, a single 1024x1024 icon is sufficient — Xcode generates all sizes automatically.

## Android Build

```bash
# Add Android platform (first time only)
npx cap add android

# Sync web files
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK**
2. Create a keystore (first time) or select existing
3. Build an **Android App Bundle (.aab)** for Play Store

### Android App Icons

Use Android Studio's **Image Asset Studio**:
1. Right-click `res` > **New > Image Asset**
2. Select `icons/icon-1024.png` as source
3. It generates all required sizes automatically

## App Store Submission

### iOS (App Store Connect)

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app: **צבעוני!**, Bundle ID: `com.tsivoni.game`
3. Fill in metadata from `docs/app-store-metadata.md`
4. Set **Privacy Policy URL**: `https://shayko1.github.io/hebrew-uno-game/privacy-policy.html`
5. Upload screenshots (see metadata doc for recommended screenshots)
6. Upload the build from Xcode
7. Submit for review

### Android (Google Play Console)

1. Sign in to [Google Play Console](https://play.google.com/console)
2. Create new app: **צבעוני!**
3. Fill in store listing from `docs/app-store-metadata.md`
4. Set **Privacy Policy URL**: same as above
5. Upload the .aab from Android Studio
6. Set content rating: **Everyone** (IARC questionnaire)
7. Submit for review

## Updating the App

After making web changes:

```bash
npx cap sync
npx cap open ios   # or android
```

Then build and upload a new version.

## Notes

- The app ID `com.tsivoni.game` must match across Capacitor config, Xcode, and App Store
- Keep the service worker — it enables offline play inside the native wrapper
- The `webDir` is `.` (project root) since this is a vanilla JS project with no build step
