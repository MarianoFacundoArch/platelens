# PlateLens Setup

1. Install dependencies:
   ```bash
   npm install --global expo-cli firebase-tools
   ```
2. Bootstrap the mobile app:
   ```bash
   cd app
   npm install
   npm run start
   ```
3. Bootstrap Firebase Functions:
   ```bash
   cd functions
   npm install
   npm run build
   ```
4. Populate `auth.txt` with the secrets requested in `status.txt`.
5. Copy `.env.example` files into `.env` for both app and functions and fill placeholders.
6. Login everywhere:
   - `expo login`
   - `npx eas-cli init`
   - `firebase login`
7. Run `npm run lint` and `npm run test` before pushing.
