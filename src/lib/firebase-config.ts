// Firebase client-side configuration.
// Initializes Firebase Messaging for browser push notifications via FCM.
// The FCM token is sent to the server on login, and the server uses it
// to push notifications to this specific device.

import { initializeApp } from 'firebase/app'
import { getMessaging, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
}

let app: ReturnType<typeof initializeApp> | null = null
let messaging: Messaging | null = null

export function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseMessaging() {
  if (!messaging) {
    try {
      messaging = getMessaging(getFirebaseApp())
    } catch (e) {
      console.error('[fcm] Failed to initialize messaging:', e)
    }
  }
  return messaging
}

export { firebaseConfig }
