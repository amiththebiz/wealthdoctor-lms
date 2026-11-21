// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration (Directly coded to avoid env issues)
const firebaseConfig = {
  apiKey: "AIzaSyDAExZZRbXq0vT0-GSNVrbvQtyDtOwaX9M",
  authDomain: "wealth-doctor-lms.firebaseapp.com",
  databaseURL: "https://wealth-doctor-lms-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wealth-doctor-lms",
  storageBucket: "wealth-doctor-lms.appspot.com",
  messagingSenderId: "437257457392",
  appId: "1:437257457392:web:e5a3c8fdf35831646b3c35",
  measurementId: "G-DCM307TV0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Auth and Firestore so the app can use them
export const auth = getAuth(app);
export const db = getFirestore(app);