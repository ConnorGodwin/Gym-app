# Store listing kit

Everything needed for the Google Play and App Store listings. Screenshots are generated with
`cd tests && node screenshots.js`. Re-run that after design changes.

## Before submitting
- [ ] **Pick the final app name.** "Forge" is very likely taken in both stores; search both before deciding. The name is set in `native/capacitor.config.json`, `native/android/app/src/main/res/values/strings.xml` and `CFBundleDisplayName` in `native/ios/App/App/Info.plist`.
- [ ] **Confirm the app ID.** It is currently `com.connorgodwin.forge` and **cannot be changed after the first upload**. Change it in `capacitor.config.json` and `android/app/build.gradle` (namespace + applicationId) and in Xcode (bundle identifier).
- [ ] Privacy policy URL: https://connorgodwin.github.io/Gym-app/privacy.html
- [ ] Support/contact URL: https://github.com/ConnorGodwin/Gym-app/issues (or an email address you're happy to publish)

---

## Listing text

**App name (30 chars max):** Forge: Workout & Diet Tracker *(placeholder)*

**Short description (Google Play, 80 chars):**
Gym, running & HYROX workouts, smart progression, food diary and body tracking.

**Subtitle (App Store, 30 chars):** Train smarter. Eat better.

**Full description:**

Forge brings training, nutrition and body tracking into one private app. There are no adverts, no accounts, and your data stays on your phone.

TRAIN SMARTER
• 500+ exercises with images, videos and step-by-step instructions
• 34 ready-made plans you can fully edit: gym, powerlifting, calisthenics, Couch to 5K, half and full marathon, triathlon, HYROX, football, rugby, tennis, boxing, climbing, golf, mobility and more
• See exactly what you lifted last time, and get a suggested weight, sets and reps for today
• Warm-up sets, RPE, supersets, drop sets, plate calculator and deload weeks
• Rest timer with alerts, plus stopwatch, countdown, intervals (Tabata, EMOM) and a HYROX race mode with live splits
• Edit past workouts or log ones you missed

EAT BETTER
• Food diary with barcode scanning and millions of products from Open Food Facts
• Calorie and macro targets from your stats and goal, plus a weekly check-in that adjusts them to your real results
• Recipes, saved meals, a weekly meal planner and an automatic shopping list
• Water tracking

SEE YOUR PROGRESS
• Bodyweight trend, measurements and private progress photos with side-by-side comparison
• Weekly summary, streaks, training calendar, muscle map, personal records and achievements
• kg or lb, and stone & lb, ft & in, cm or inches for body stats

PRIVATE BY DESIGN
Everything you log is stored on your device. Export a backup whenever you like.

Forge provides general fitness information, not medical advice.

**Keywords (App Store, 100 chars):**
workout,gym,tracker,hyrox,calorie,macro,diet,running,strength,fitness,log,plan,weight,protein,coach

**Category:** Health & Fitness (both stores)

**Screenshots** (in `screenshots/`):
| File | Caption |
|---|---|
| 1-train | Your week at a glance, with today's session ready to start |
| 2-workout | Know what to lift: last time and today's target, set by set |
| 3-exercise | Video, images and coaching cues for every lift |
| 4-food | Calories and macros, with a weekly check-in that adapts |
| 5-progress | Weekly summary, streaks and training calendar |
| 6-body | Weight trend, measurements and progress photos |
| 7-plans | 34 plans for the gym, running, team sports and more |
| 8-hyrox | HYROX race mode with live splits |

Google Play also needs a **feature graphic** (1024×500) and a **512×512 icon** (`native/scripts/make-icons.py` can export one at any size).

---

## Google Play: Data safety form
- **Does your app collect or share any of the required user data types?** No. Data is processed only on the device. ("Collected" means sent off the device to you or a third party; Forge doesn't do that.)
- Food search terms and barcodes go to Open Food Facts to look up products, with no user identifiers. Google treats this as ephemeral processing to provide a feature, not collection. If unsure, declare "App activity → Other actions: not collected, processed ephemerally".
- **Is data encrypted in transit?** Yes (HTTPS).
- **Can users request data deletion?** Data is on-device: users delete it in Settings → Erase all data, or by uninstalling.

**Health apps declaration:** select *Fitness and wellness*. It does not use Health Connect yet.
**Permissions to justify:** notifications (timer alerts); exact alarms (rest timer accuracy). The app does not request camera permission on Android: it uses Google's code scanner and the system camera app.

## Apple: App Privacy ("nutrition label")
- **Data Not Collected.** All data stays on device, and Open Food Facts lookups carry no identifiers.
- **Export compliance:** uses only standard HTTPS (`ITSAppUsesNonExemptEncryption = NO` is already set).
- **Review notes (paste into App Review Information):** "Forge stores all data on the device. No login is required. To test: Plans → add 'Push / Pull / Legs' → Start, tick a set to see the rest timer; Food → Add food → Search 'yogurt'; Timer → HYROX. Camera is used only for barcode scanning and optional progress photos."

## Content rating questionnaire (both stores)
No violence, sexual content, profanity, gambling, drugs, user-generated content shared with others, location sharing or purchases. Expected rating: **Everyone / 4+**. Answer "No" to user interaction or sharing features.

---

## Release steps

**Google Play** (first release)
1. Create a Play Console account ($25) and the app (name, default language, app or game: App, free).
2. Create an **upload keystore** once and keep it safe (lose it and you need Google's help to reset it):
   `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
3. Add GitHub secrets: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= upload), `ANDROID_KEY_PASSWORD`.
4. Run **Actions → Native apps → Run workflow**, then download `forge-android-release-aab`.
5. Upload it to **Testing → Closed testing**, add at least **12 testers**, and keep the test running for **14 days**. Then apply for production access.

**App Store**
1. Apple Developer Program ($99/yr) and a new app in App Store Connect (bundle ID must match the app ID).
2. Signing: either build once on a Mac with Xcode (Product → Archive → Distribute), or add the certificate and provisioning profile as GitHub secrets so the workflow can produce a signed `.ipa` (to be added to `native.yml` when you're ready).
3. Upload to **TestFlight**, test, then submit for review.
