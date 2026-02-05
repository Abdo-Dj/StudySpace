
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCq6jkDrMBh4Gn5EK2sYgX3OIP_9OAHO_4",
  authDomain: "study-space-a0416.firebaseapp.com",
  projectId: "study-space-a0416",
  storageBucket: "study-space-a0416.firebasestorage.app",
  messagingSenderId: "719391432099",
  appId: "1:719391432099:web:90ffff32a9dd76ee75ce16",
  measurementId: "G-2V1658ESKC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
