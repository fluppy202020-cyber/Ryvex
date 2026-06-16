# 📱 Ryvex Esports — Flutter APK Conversion Guide

This guide describes how to convert your **Ryvex Esports web application** into a production-ready, highly polished **Android APK / iOS App** using the ready-made Flutter wrapper included in this repository.

---

## ⚡ 1. Prerequisites
Ensure you have the following installed on your local computer:
- **Flutter SDK**: [Download & Setup Flutter](https://docs.flutter.dev/get-started/install)
- **Android Studio / Command Line Tools** (for Android compilation)
- **VS Code or Android Studio** (highly recommended)

---

## 🛠️ 2. Rapid Bootstrap (Generate Local Build Folders)
Because of workspace storage conservation, full configuration files for Android Gradle systems can be thousands of files. Rather than importing heavy boilerplates, you can generate the latest clean native folders in **3 seconds** using the Flutter compiler:

1. **Download/Export your workspace ZIP** or pull your repository from GitHub.
2. Open your terminal in the downloaded project folder (where `pubspec.yaml` is located).
3. Run the following command. It will check your configurations and automatically restore all boilerplate files matching your system's current Flutter release:
   ```bash
   flutter create . --platforms=android,ios
   ```

---

## 📦 3. Compiling into Android APK
Once the native workspace is restored, building your `.apk` package is a single command:

1. Validate dependencies are loaded correctly:
   ```bash
   flutter pub get
   ```
2. Build the high-performance release APK package:
   ```bash
   flutter build apk --release
   ```
3. Your compiled, installable `.apk` file will immediately be created and saved under:
   ```
   build/app/outputs/flutter-apk/app-release.apk
   ```

You can now easily share this file with players, load it on your phone, or publish it directly on the Google Play Console!

---

## 🛡️ Quick Customization (lib/main.dart)
Your app configuration links directly to your cloud production deployment. If you deploy a custom domain later:
1. Open up `/lib/main.dart` in your code editor.
2. Locate the link loaded by the controller:
   ```dart
   ..loadRequest(Uri.parse('https://ais-pre-govz3lymi2yffbisjghiqj-108592318181.asia-southeast1.run.app'))
   ```
3. Swap it with your custom domain (e.g. `https://esports.ryvex.gg`) and run compilation again!
