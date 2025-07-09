import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyCtn8meB986OISnp_e7905lyeo4cjdyxhc",
  authDomain: "ai-gora.firebaseapp.com",
  projectId: "ai-gora",
  storageBucket: "ai-gora.firebasestorage.app",
  messagingSenderId: "269453400352",
  appId: "1:269453400352:web:4b2e0e7b78af02eabb5f45",
  measurementId: "G-EGTJS7F4WH",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics
export const analytics = getAnalytics(app)
