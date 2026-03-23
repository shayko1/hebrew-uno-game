import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import { getDb, getUid, ensureAuth } from './firebase-config.js';

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
let roomUnsubscribe = null;
let currentRoomCode = null;

export function getCurrentRoomCode() {
  return currentRoomCode;
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function roomRef(code) {
  return doc(getDb(), 'rooms', code);
}

export async function createRoom(nickname) {
  const uid = await ensureAuth();
  const code = generateRoomCode();

  const existing = await getDoc(roomRef(code));
  if (existing.exists()) {
    return createRoom(nickname);
  }

  const roomData = {
    code,
    hostId: uid,
    status: 'waiting',
    createdAt: serverTimestamp(),
    players: {
      [uid]: {
        nickname: nickname || 'host',
        index: 0,
        connected: true,
        lastSeen: serverTimestamp()
      }
    },
    gameState: null,
    guestHand: null,
    hostHandCount: 0,
    moves: [],
    moveIndex: 0
  };

  await setDoc(roomRef(code), roomData);
  currentRoomCode = code;
  return code;
}

export async function joinRoom(code, nickname) {
  const uid = await ensureAuth();
  const ref = roomRef(code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const data = snap.data();

  if (data.status !== 'waiting') {
    throw new Error('ROOM_NOT_AVAILABLE');
  }

  if (data.hostId === uid) {
    throw new Error('CANNOT_JOIN_OWN_ROOM');
  }

  const playerCount = Object.keys(data.players || {}).length;
  if (playerCount >= 2) {
    throw new Error('ROOM_FULL');
  }

  await updateDoc(ref, {
    [`players.${uid}`]: {
      nickname: nickname || 'guest',
      index: 1,
      connected: true,
      lastSeen: serverTimestamp()
    },
    status: 'playing'
  });

  currentRoomCode = code;
  return data;
}

export async function quickMatch(nickname) {
  await ensureAuth();
  const uid = getUid();
  const db = getDb();

  const cutoff = Timestamp.fromMillis(Date.now() - ROOM_TTL_MS);
  const q = query(
    collection(db, 'rooms'),
    where('status', '==', 'waiting'),
    where('createdAt', '>', cutoff),
    orderBy('createdAt', 'asc'),
    limit(5)
  );

  const results = await getDocs(q);
  for (const roomDoc of results.docs) {
    const data = roomDoc.data();
    if (data.hostId === uid) continue;

    try {
      await joinRoom(roomDoc.id, nickname);
      return { type: 'joined', code: roomDoc.id };
    } catch {
      continue;
    }
  }

  const code = await createRoom(nickname);
  return { type: 'created', code };
}

export function listenToRoom(code, callbacks) {
  stopListening();
  currentRoomCode = code;

  const ref = roomRef(code);
  roomUnsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (callbacks.onDeleted) callbacks.onDeleted();
      return;
    }
    const data = snap.data();
    if (callbacks.onUpdate) callbacks.onUpdate(data);
  }, (error) => {
    if (callbacks.onError) callbacks.onError(error);
  });

  return roomUnsubscribe;
}

export function stopListening() {
  if (roomUnsubscribe) {
    roomUnsubscribe();
    roomUnsubscribe = null;
  }
}

export async function updatePresence(connected) {
  if (!currentRoomCode) return;
  const uid = getUid();
  if (!uid) return;

  try {
    await updateDoc(roomRef(currentRoomCode), {
      [`players.${uid}.connected`]: connected,
      [`players.${uid}.lastSeen`]: serverTimestamp()
    });
  } catch {
    // Room may have been deleted
  }
}

export async function writeMove(move) {
  if (!currentRoomCode) return;
  const uid = getUid();
  if (!uid) return;

  const ref = roomRef(currentRoomCode);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const moves = data.moves || [];
  moves.push({
    ...move,
    playerId: uid,
    timestamp: Date.now()
  });

  await updateDoc(ref, {
    moves,
    moveIndex: moves.length
  });
}

export async function updateGameState(stateUpdate) {
  if (!currentRoomCode) return;
  await updateDoc(roomRef(currentRoomCode), stateUpdate);
}

export async function setRoomStatus(status) {
  if (!currentRoomCode) return;
  await updateDoc(roomRef(currentRoomCode), { status });
}

export async function leaveRoom() {
  if (!currentRoomCode) return;
  const uid = getUid();

  stopListening();

  if (uid) {
    try {
      const ref = roomRef(currentRoomCode);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.hostId === uid && data.status === 'waiting') {
          await deleteDoc(ref);
        } else {
          await updateDoc(ref, {
            [`players.${uid}.connected`]: false,
            status: 'abandoned'
          });
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  currentRoomCode = null;
}
