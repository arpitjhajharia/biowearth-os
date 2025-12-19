import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyCrG4v4iWRTrbuxTDclaQAgVjUL8vOQ0YY",
  authDomain: "bwg-dashboard.firebaseapp.com",
  projectId: "bwg-dashboard",
  storageBucket: "bwg-dashboard.firebasestorage.app",
  messagingSenderId: "806991630520",
  appId: "1:806991630520:web:ee0eb972d192288dce244d",
  measurementId: "G-5PY7NV9S55"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = 'biowearth-erp-prod';