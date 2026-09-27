# Jet Arena — Android app

A thin full-screen WebView around the game. The whole game is bundled inside
the APK, so **the app works with no internet at all**: solo play against bots
and Survival work on a plane, in class, anywhere.

For playing **together**, one computer still runs the little Node server
(`play.bat`) — phones can't run it. Everyone else taps **SERVER** on the menu,
types that computer's address, then **JOIN LAN**.

## Build the APK (about 15 minutes, once)

You need [Android Studio](https://developer.android.com/studio) — it brings its
own Java and Android SDK, so nothing else to install.

1. Open Android Studio → **Open** → pick this `android` folder.
2. Wait for the first Gradle sync (it downloads the build tools — needs
   internet **this once**). If it offers to upgrade the Gradle plugin, accept.
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. When it finishes, click **locate** in the notification. The file is:

   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

That APK is installable as-is — a debug APK is signed with a local debug key,
which is fine for sharing with friends (it just can't go on the Play Store).

### From the command line instead

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

(The Gradle wrapper files are created by Android Studio on first sync.)

## Give it to your friends

Send them `app-debug.apk` over WhatsApp/Telegram/Drive/USB. On their phone:

1. Tap the file.
2. Android will say installs from this source are blocked → **Settings** →
   allow it for that app → **Install**.
3. It appears as **Jet Arena** with its own icon, and opens full screen in
   landscape.

Nothing else to set up.

## Playing together over a hotspot

1. One person turns on a **phone hotspot**; the laptop joins it.
2. On the laptop, run **`play.bat`** (from the main folder). It prints a line
   like `for your friends: http://192.168.43.12:8123`.
3. In the app on each phone: tap **SERVER**, type `192.168.43.12:8123`, then
   tap **JOIN LAN**.
4. On the laptop's browser (`http://localhost:8123`) pick **HOST LAN** and
   **START MATCH**. Everyone drops in.

The address is remembered, so it's one tap next time.

## Updating the app after changing the game

```bash
android\sync-assets.bat        # copies index.html etc. into assets
```

Then build the APK again. Bump `versionCode`/`versionName` in
`app/build.gradle` if you want phones to treat it as an update.

## Notes

- `minSdk 23` — Android 6.0 and newer.
- `usesCleartextTraffic="true"` is needed because LAN play talks plain
  `http`/`ws` to a laptop on your own Wi-Fi. The app never contacts the
  internet.
- The in-game `[ ]` fullscreen button does nothing here — the app is already
  full screen.
- No libraries, no analytics, no accounts.
