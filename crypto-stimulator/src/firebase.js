// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6w8WiqimVijKHFniCM-3wUQpG-58XHg0",
  authDomain: "eloncrypto-7c391.firebaseapp.com",
  projectId: "eloncrypto-7c391",
  storageBucket: "eloncrypto-7c391.appspot.com",
  messagingSenderId: "222830680172",
  appId: "1:222830680172:web:269227ef697e8fedb52049",
  measurementId: "G-3CTG2V05MF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);