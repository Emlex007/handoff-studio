console.log("Firebase.ts: Module loading...");

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, inMemoryPersistence, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

console.log("Firebase.ts: Config loaded", firebaseConfig);

const app = initializeApp(firebaseConfig);
console.log("Firebase.ts: App initialized");

let analytics;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
    console.log("Firebase.ts: Analytics initialized");
  } catch (error) {
    console.warn("Firebase.ts: Analytics initialization failed:", error);
  }
}

const auth = initializeAuth(app, {
  persistence: inMemoryPersistence
});
console.log("Firebase.ts: Auth initialized with inMemoryPersistence");

const db = getFirestore(app);
console.log("Firebase.ts: Firestore initialized");

export const initTracking = async () => {
  console.log("Firebase.ts: initTracking called");
  try {
    console.log("Firebase.ts: Calling signInAnonymously...");
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log("Firebase Anonymous Auth UID:", user.uid);
    
    console.log("Firebase.ts: Calling setDoc in Firestore...");
    await setDoc(doc(db, "active_users", user.uid), {
      lastSeen: serverTimestamp(),
      uid: user.uid
    }, { merge: true });
    
    console.log("Firebase Tracking Active");
  } catch (error) {
    console.error("Firebase tracking error:", error);
  }
};
