# SalahTime

## App Setup Instructions 
  -  Node.js: v18+ (recommended for Angular 16) Project created using Angular CLI v16 
  Angular CLI: v16

Capacitor: v5+

Java: JDK 21 ✅ (Java 21 is supported for latest Android Gradle Plugin 8+)
  -  Start local server: `ng serve`
  -  Open app at: http://localhost:4200/ Auto reloads on source file changes
  -  Generate a new component: `ng generate component component-name`
  -  View all schematics: `ng generate --help`
  -  Build the project: `ng build`

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Mobile APK Build Instructions

Follow these steps to generate a signed APK for your Angular + Capacitor project.
1. Build Angular App Run the following command to build your Angular project:    ` npm run build`
2. install capasitor packs   `npm install @capacitor/android@^7.4.4 @capacitor/cli@^7.4.4 @capacitor/core@^7.4.4 @capacitor/geolocation@^7.0.0 @capacitor/local-notifications@^7.0.4 @capacitor/status-bar@^7.0.4`
3. `npx cap init` and change dist path in  capacitor.config.ts (only first time)
4. Add Android Platform (Only Once) Add the Android platform to your project:      `npx cap add android` (Skip this step if Android platform is already added to avoid overwriting changes.)
5. Copy Web Assets to Capacitor Copy the web assets to Capacitor:    `npx cap copy` and `npx cap sync android`
6. Copy Again After Adding Platform Copy assets specifically for Android: `npx cap copy android`
7. Open Android Project in Android Studio Open the Android project:`npx cap open android`
8. (Optional) Build Unsigned Release APK via Command Line Navigate to the Android folder:    `cd android`
9. Run Gradle to assemble the release APK: `gradlew clean` then`gradlew assembleRelease`
10. This generates `app-release-unsigned.apk` at: `cd D:\salah-time-board\android\app\build\outputs\apk\release`
generate key for the first time
`keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000` set password : 543@Fareed
11. Sign the APK Sign the unsigned APK using Generate APK : `apksigner sign --ks "D:\salah-time-board\my-release-key.keystore" --out "D:\salah-time-board\android\app\build\outputs\apk\release\salahtime-signed.apk" "D:\salah-time-board\android\app\build\outputs\apk\release\app-release-unsigned.apk"`
12. Verify the APK :   `apksigner verify --verbose "D:\salah-time-board\android\app\build\outputs\apk\release\salahtime-signed.apk"`

---




## After Every change instruction to generate new build
ng build --configuration=production
npx cap copy    
npx cap sync android
npx cap copy android
cd android
`gradlew clean`
Run one of the following (inside android folder): `gradlew bundleRelease`
`apksigner sign --ks "D:\salah-time-board\my-release-key.keystore" --out D:\salah-time-board\android\app\build\outputs\bundle\release\salahtime.aab" "D:\salah-time-board\android\app\build\outputs\bundle\release\app-release.aab"`


Generate logo from : https://makeappicon.com/
https://play.google.com/apps/internaltest/4700902351378718630

