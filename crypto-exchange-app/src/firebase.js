
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBa2bv4IBizGiBcOf3pGGzO9lpwOulW0eA",
  authDomain: "eloncrypto-1ce3f.firebaseapp.com",
  projectId: "eloncrypto-1ce3f",
  storageBucket: "eloncrypto-1ce3f.firebasestorage.app",
  messagingSenderId: "130958585628",
  appId: "1:130958585628:web:e7107071661a3e39a954d9",
  measurementId: "G-D7ZRX57D64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
