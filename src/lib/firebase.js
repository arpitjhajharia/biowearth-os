import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOBsIw0IMvTViKnU6xD8dO4BfYd_DVMzw",
  authDomain: "bwg-erp.firebaseapp.com",
  projectId: "bwg-erp",
  storageBucket: "bwg-erp.firebasestorage.app",
  messagingSenderId: "318493308192",
  appId: "1:318493308192:web:cb12963ae96d3335aad345"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = 'biowearth-erp-prod';