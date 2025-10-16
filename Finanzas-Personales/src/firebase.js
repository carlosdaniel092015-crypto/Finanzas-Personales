// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
