import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD3BZDGuzDBOIZshWn6Hj54lXX4SmDgJuc",
  authDomain: "furrys-1576d.firebaseapp.com",
  projectId: "furrys-1576d",
  storageBucket: "furrys-1576d",
  messagingSenderId: "251413799008",
  appId: "1:251413799008:web:21ecb53fce217a08df6305",
  measurementId: "G-P0J0RTYGTC"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export { auth, provider, db, signInWithPopup };
