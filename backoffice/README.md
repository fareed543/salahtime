# Oneportal

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


# Mobile APK Build Instructions

Follow these steps to generate a signed APK for your Angular + Capacitor project.
1. Build Angular App Run the following command to build your Angular project:    ` npm run build`
2. install capasitor packs   `npm install @capacitor/android@^7.4.4 @capacitor/cli@^7.4.4 @capacitor/core@^7.4.4 @capacitor/geolocation@^7.0.0 @capacitor/local-notifications@^7.0.4 @capacitor/status-bar@^7.0.4`
3. npx cap init and change dist path in  capacitor.config.ts (only first time)
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