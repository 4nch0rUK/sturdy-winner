# Publishing Guide

This project is set up for:
- web deployment via GitHub Pages
- native Android/iOS app packaging via Capacitor
- automatic Android artifact builds on Git tag pushes

## A) Web Version (Public URL)

### 1. Create and push to GitHub
Run these commands in this folder after creating an empty GitHub repo:

```powershell
git init
git add .
git commit -m "Initial Contract Whist app"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### 2. Enable GitHub Pages
1. Open your repo on GitHub.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Pushes to `main` will deploy using `.github/workflows/deploy-pages.yml`.

URL format:

```text
https://<your-github-username>.github.io/<repo-name>/
```

## B) Quick Downloadable APK (No Local Android Setup)

Workflow file:
- `.github/workflows/android-tag-build.yml`

How to build and download:
1. Push this project to GitHub.
2. Open your repo in GitHub.
3. Go to `Actions -> Build Android Artifacts (Tags)`.
4. Click `Run workflow`.
5. When it finishes, open the run and download the artifact zip.
6. Inside it, use `app-debug.apk` to install on your Android device.

Tag-based option (also creates a GitHub Release):

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Then download `app-debug.apk` from the release assets.

## C) Android + iOS Native Packaging (Full Release Flow)

### 1. Prerequisites
- Node.js 20 LTS+
- npm
- Android Studio + Android SDK + JDK 17
- macOS + Xcode (required for iOS builds)
- Apple Developer account (App Store/TestFlight)
- Google Play Console account (Play Store)

### 2. Install dependencies
```powershell
npm install
```

### 3. Generate branding assets (icon/splash)
Source generator and output:
- script: `scripts/generate-branding-assets.ps1`
- output folder: `resources/`

Commands:

```powershell
npm run brand:assets:win  # Windows only, optional if you want to regenerate base PNGs
npm run cap:assets
```

### 4. Add native projects (first time only)
```powershell
npm run prepare:web
npx cap add android
npx cap add ios
```

### 5. Open native projects
```powershell
npm run cap:android
npm run cap:ios
```

### 6. Build release artifacts manually
- Android (Android Studio):
1. `Build -> Generate Signed Bundle / APK`
2. Choose `Android App Bundle (AAB)` for Play Store.

- iOS (Xcode):
1. `Product -> Archive`
2. Upload to App Store Connect.

## Store Listing Templates
Templates are pre-created in `store-listing/`:
- `google-play-template.md`
- `app-store-template.md`
- `privacy-policy-template.md`

## Updating After Code Changes
Whenever you change `index.html`, `app.js`, or `styles.css`:

```powershell
npm run prepare:web
npx cap sync
```

Then rebuild in Android Studio / Xcode (or run GitHub workflow for a new APK).

## Notes
- Player cap is set to 8.
- Min start/end cards are set to 2.
