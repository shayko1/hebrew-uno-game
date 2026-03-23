import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js';
import {
  getFirestore,
  enableNetwork,
  disableNetwork
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBpCsmnid1amMimuzCAEp8weRW4Ubu9jQQ",
  authDomain: "tsivoni-game.firebaseapp.com",
  projectId: "tsivoni-game",
  storageBucket: "tsivoni-game.firebasestorage.app",
  messagingSenderId: "1095229840160",
  appId: "1:1095229840160:web:7719ba6833e331068b1545"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUid = null;
let connectionListeners = [];

export function getDb() {
  return db;
}

export function getUid() {
  return currentUid;
}

export async function ensureAuth() {
  if (currentUid) return currentUid;

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUid = user.uid;
        unsubscribe();
        resolve(user.uid);
      }
    });

    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      reject(err);
    });
  });
}

export function onConnectionChange(callback) {
  connectionListeners.push(callback);
  return () => {
    connectionListeners = connectionListeners.filter((cb) => cb !== callback);
  };
}

function notifyConnectionChange(online) {
  connectionListeners.forEach((cb) => cb(online));
}

// Track browser online/offline
window.addEventListener('online', () => {
  enableNetwork(db);
  notifyConnectionChange(true);
});

window.addEventListener('offline', () => {
  disableNetwork(db);
  notifyConnectionChange(false);
});
