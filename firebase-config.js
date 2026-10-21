import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  get,
  update,
  getDatabase,
  ref,
  onValue,
  set,
  push,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDulOvuYdcL58VCqx0mz23puNuEzcumaqQ",
  authDomain: "htci-2ab87.firebaseapp.com",
  databaseURL:
    "https://htci-2ab87-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "htci-2ab87",
  storageBucket: "htci-2ab87.firebasestorage.app",
  messagingSenderId: "1040049745013",
  appId: "1:1040049745013:web:ce58bbd2c53f50a82adc3c",
  measurementId: "G-T0R7HYEDCF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export {
  auth,
  database,
  get,
  update,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  ref,
  onValue,
  set,
  push,
  serverTimestamp,
};
