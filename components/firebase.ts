// Firebase client setup for Next.js (robust, supports SSR and client)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRm7QlbivJEawLYatvR7WavT5c0-eOOCU",
  authDomain: "edueron-a0ce0.firebaseapp.com",
  projectId: "edueron-a0ce0",
  storageBucket: "edueron-a0ce0.appspot.com",
  messagingSenderId: "769565037918",
  appId: "1:769565037918:web:cd5f824e76411f92ed6bcf",
  measurementId: "G-233VLEGR8E"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage }; 