import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBP0QI-dSV86INLqfGAHV0L22b5xUTjhnM",
  authDomain: "health-e8b5f.firebaseapp.com",
  projectId: "health-e8b5f",
  storageBucket: "health-e8b5f.firebasestorage.app",
  messagingSenderId: "616448951321",
  appId: "1:616448951321:web:de77180868b08670c19688",
  measurementId: "G-TPKPWJFETN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);