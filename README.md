# Mercer Messenger 10.5.6

## Included
- Refactored `index.html` with external CSS/JS modules.
- Firebase Phone Auth, Firestore, Storage and Realtime Database presence.
- True online/offline presence using Realtime Database `.info/connected` + `onDisconnect`.
- Message ticks: one gray = sent, two gray = delivered, two green = read.
- Offline-call guard with the requested “User is currently offline” toast.
- Cleaner audio/video call controls with incoming ringtone and outgoing dial tone.
- Device-local 6-digit app PIN and WebAuthn platform-credential unlock.
- Preset, color and uploaded-image chat wallpapers.
- 24-hour status expiry plus optional scheduled Firebase cleanup.
- Authenticated-session route handling and persistent Firebase auth.
- Responsive settings switches and UI polish.
- Help & FAQ: 0116 142639 / kitsaokelvin2@gmail.com.
- App Version: 10.5.6.

## Deploy
Upload the contents of this directory to Firebase Hosting, Vercel, Netlify, or another HTTPS host. Keep `index.html`, `manifest.webmanifest`, `sw.js`, `assets/`, and `icons/` at the shown paths.

### Realtime Database
Deploy `database.rules.json` to your Firebase Realtime Database. The rules allow authenticated users to read presence and only let a user write their own `/status/{uid}` record.

### Status cleanup
The `functions/` directory contains an optional scheduled Cloud Function. Deploy it with Firebase Functions to remove expired statuses server-side. Scheduled functions generally require a Firebase project/billing setup that supports Cloud Scheduler.

### PWA
The service worker caches the app shell and runtime-caches Firebase/PeerJS/OneSignal SDK resources after the first successful online load. A service worker cannot make first-time Firebase authentication work without network access, but an already signed-in session and cached app shell can reopen offline.

## Security note
The Firebase web configuration in `assets/js/app.js` is client configuration, not a server secret. Protect Firestore, Storage and Realtime Database with Firebase Security Rules. The local PIN/WebAuthn feature is a device/app lock and is not a replacement for server-side account 2FA.
