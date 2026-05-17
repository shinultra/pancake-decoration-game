import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let authPromise = null;
function ensureAuth() {
  if (!authPromise) {
    authPromise = signInAnonymously(auth).then((cred) => cred.user);
  }
  return authPromise;
}

function sanitizeName(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 'ななし';
  return s.slice(0, 50);
}

export async function submitScore(playerName, score) {
  const user = await ensureAuth();
  const name = sanitizeName(playerName);
  const num = Math.max(0, Math.min(1000, Math.floor(Number(score) || 0)));
  const ref = await addDoc(collection(db, 'scores'), {
    playerName: name,
    score: num,
    timestamp: Date.now(),
    uid: user.uid,
  });
  return { id: ref.id, playerName: name, score: num };
}

export async function fetchTopScores(n = 50) {
  const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
