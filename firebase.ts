// Import fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase Anda yang tadi Anda berikan
const firebaseConfig = {
  apiKey: "AIzaSyDeaOyLoTbBgYbUhymacMzDgDF2tyuqF0w",
  authDomain: "koperasi-annahl-app.firebaseapp.com",
  projectId: "koperasi-annahl-app",
  storageBucket: "koperasi-annahl-app.appspot.com",
  messagingSenderId: "863547564990",
  appId: "1:863547564990:web:fd342600cf390ff6460fef",
  measurementId: "G-LJL3TBLVQF"
};

// Inisialisasi aplikasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Cloud Firestore dan ekspor untuk digunakan di komponen lain
export const db = getFirestore(app);
