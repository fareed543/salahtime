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
2. install capasitor packs   `npm install @capacitor/core@4 @capacitor/cli@4 @capacitor/android@4` and `npm install @capacitor/geolocation`
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

---




## After Every change instruction to generate new build
ng build --configuration=production
npx cap copy    
npx cap sync android
npx cap copy android
cd android
cd android
Run one of the following (inside android folder): `gradlew bundleRelease`
`apksigner sign --ks "D:\salah-time-board\my-release-key.keystore" --out D:\salah-time-board\android\app\build\outputs\bundle\release\salahtime.aab" "D:\salah-time-board\android\app\build\outputs\bundle\release\app-release.aab"`


Generate logo from : https://makeappicon.com/
https://play.google.com/apps/internaltest/4700902351378718630






Prayer Times 
Logo    


i wanto build mobile app

about salah
salah timings

faraiz
sunnat
wajibaad
mustahab
makruhaat.

so that every one should know about salah.


🕌 Prayer Times – Your Complete Salah Companion

Description:
Prayer Times is a beautifully designed Islamic mobile app that helps every Muslim stay connected with their daily prayers. Whether you’re at home, at work, or traveling, this app provides accurate Salah timings, detailed prayer guidance, and essential knowledge about every aspect of Salah — all in one place.

🌙 Key Features

📅 Accurate Salah Timings:
Get real-time and location-based prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) with elegant daily and weekly views.

🕌 Detailed Salah Guidance:
Learn everything about Salah, including:

Faraiz (Obligatory acts) – What makes Salah valid and complete.

Sunnat (Recommended acts) – Actions performed by the Prophet ﷺ.

Wajibat (Necessary acts) – Actions that should not be missed.

Mustahab (Preferred acts) – Actions that increase reward.

Makruhaat (Disliked acts) – Things to avoid during Salah.

🧭 Qibla Direction Finder:
Find the direction of the Kaaba easily using the built-in compass.

🕋 Islamic Calendar & Reminders:
Stay updated with Islamic dates and get smart reminders before each Salah.

📖 Educational Section:
Enhance your understanding of Salah through authentic references and easy-to-follow explanations.

🎨 Simple & Elegant UI:
Clean design, smooth performance, and dark/light modes for better user comfort.

📱 Why Use Prayer Times?

Our goal is to make Salah easy to understand and punctual for everyone — from beginners to lifelong practitioners. The app not only tells you when to pray but also teaches you how and why to pray correctly.

Developer’s Note:
Prayer Times is a humble effort to spread knowledge and awareness about Salah — the foundation of Islam. May it guide and remind us all to stay regular in our prayers.

Keywords:
Salah, Prayer Times, Namaz, Islamic App, Muslim Prayer, Quran, Islam, Salah Guide, Faraiz, Sunnat, Wajibat, Mustahab, Makruh, Qibla, Adhan, Prayer Reminder, Islamic Calendar.

Would you like me to tailor this description for the Google Play Store listing format (with sections like “Short description,” “Full description,” and “What’s new”) or for the Apple App Store version?


Namaz Time



 fareed543@gmail.com, 
fareed54313@gmail.com, 
steman.fareed@gmail.com, 
techdefeat.com@gmail.com, abdulfareed.md@gmail.com
saits.yard@gmail.com
01ibconsulting@gmail.com

keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

Remove conflicts from the manifest before uploading. The following content provider authorities are in use by other developers: com.example.app.androidx-startup, com.example.app.fileprovider.
You need to use a different package name because "com.example" is restricted.



