// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeNHyzX5bJoNccS9BWrVJ8oBjAQ4oEVxk",
  authDomain: "finanzas-e77d6.firebaseapp.com",
  projectId: "finanzas-e77d6",
  storageBucket: "finanzas-e77d6.firebasestorage.app",
  messagingSenderId: "687649991953",
  appId: "1:687649991953:web:ac9aa7bfcdc83fe3c030b0",
  measurementId: "G-9KBGC2PJPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
