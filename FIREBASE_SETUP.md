# 🔥 Firebase Setup Guide - FYB Gang Fund System

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Project name: `FYB Gang Funds` (or any name you prefer)
4. Disable Google Analytics (not needed for this project)
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In your Firebase project dashboard, go to **Firestore Database**
2. Click "Create database"
3. **Start in production mode** (we'll configure security later)
4. Choose your region (closest to your users)

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</> icon)
4. App nickname: `FYB Gang Web App`
5. **Don't check** "Also set up Firebase Hosting"
6. Click "Register app"
7. **Copy the config object** - you'll need these values!

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env` in your project root
2. Fill in your Firebase config values from Step 3:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 5: Set up Firestore Security Rules

In Firebase Console > Firestore Database > Rules, replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    // NOTE: In production, you should restrict this further
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ WARNING:** These rules allow anyone to read/write your database. For production, implement proper authentication and authorization.

## Step 6: Add Environment Variables to Netlify

1. Go to your Netlify site dashboard
2. Site settings → Environment variables
3. Add each environment variable:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Step 7: Deploy and Test

1. Build locally: `npm run build`
2. Deploy to Netlify (drag `dist` folder)
3. Your app should now use Firebase instead of localStorage!

## Firestore Collections

Your app will create these collections automatically:

- **members** - Gang member data
- **transactions** - Income and expenses
- **items** - Available items for orders
- **orders** - Member orders
- **gangfund** - Base fund amount

## Testing Firebase Connection

1. Open browser console on your deployed site
2. Look for: `🔥 Firebase Config: { projectId: "your-project-id", usingEnvVars: true }`
3. Try adding a member - it should save to Firestore
4. Check Firestore Database in Firebase Console to see the data

## Troubleshooting

- **"Firebase not defined"**: Check if environment variables are set correctly
- **"Permission denied"**: Update Firestore security rules
- **"Network error"**: Check Firebase project status and billing

## Security Notes

🚨 **Important for Production:**
1. Set up Firebase Authentication
2. Create proper Firestore security rules
3. Use environment variables for sensitive config
4. Enable billing alerts in Firebase Console

Your FYB Gang app is now ready for real Firebase integration! 💜
