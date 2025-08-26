import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRm7QlbivJEawLYatvR7WavT5c0-eOOCU",
  authDomain: "edueron-a0ce0.firebaseapp.com",
  projectId: "edueron-a0ce0",
  storageBucket: "edueron-a0ce0.appspot.com",
  messagingSenderId: "769565037918",
  appId: "1:769565037918:web:cd5f824e76411f92ed6bcf",
  measurementId: "G-233VLEGR8E"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firestore persistence failed-precondition: Multiple tabs open.');
    }
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firestore persistence unimplemented: Browser not supported.');
    }
  }
}); 