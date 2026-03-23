# Multiplayer Design — Firebase Real-Time

**Date**: 2026-03-23
**Status**: Approved

## Overview

Add real-time online multiplayer (1v1) to Tsivoni using Firebase Firestore as the sync layer. Host player is authoritative for game state. Guest sends move intents. Firebase SDK loaded via CDN.

## Decisions

- **Backend**: Firebase (Firestore + Anonymous Auth) — free tier, no server to maintain
- **SDK integration**: CDN import in index.html (~50KB gzipped)
- **Player count**: 2 players online (v1), data model supports 2-4 for future expansion
- **Authority**: Host player runs game logic via existing state.js, writes state to Firebase
- **Disconnect**: 30-second reconnect window, then bot takes over
- **YAGNI**: No chat, no spectators, no ratings, no Cloud Functions in v1

## Firebase Data Model

Each game room is a Firestore document at `rooms/{roomCode}`:

```
rooms/{roomCode}
├── code: "ABC123"
├── hostId: "uid-xxxx"
├── status: "waiting" | "playing" | "finished" | "abandoned"
├── createdAt: Timestamp
├── players: {
│     "uid-xxxx": { nickname: "שי", index: 0, connected: true, lastSeen: Timestamp },
│     "uid-yyyy": { nickname: "דני", index: 1, connected: true, lastSeen: Timestamp }
│   }
├── gameState: {                 // Written ONLY by host
│     hands: [[...], [...]],
│     drawPile: [...],
│     discardPile: [...],
│     currentPlayer: 0,
│     direction: 1,
│     currentColor: "red",
│     gameOver: false,
│     winner: null
│   }
├── opponentHand: {              // Card count only for joiner (no peeking)
│     count: 7
│   }
├── myHand: [...]                // Joiner's own hand (synced by host)
└── moves: []                    // Joiner writes move intents here
      { type: "play", cardId: "c-42", chosenColor: null, timestamp: ... }
      { type: "draw", timestamp: ... }
      { type: "lastCard", timestamp: ... }
```

**Key design choices:**
- Anonymous auth — no sign-up, UID persists across refreshes for reconnect
- Host writes gameState — single source of truth
- Joiner never sees host's hand or draw pile — only their own hand and card counts
- Moves array — joiner writes intents, host listens and validates

## Module Architecture

New files:

```
js/
├── firebase-config.js    // Firebase init, anonymous auth, connection state
├── online.js             // Room lifecycle (create, join, leave, reconnect)
├── online-host.js        // Host: listen for moves, validate, sync state
└── online-guest.js       // Guest: send intents, listen for state updates
```

Integration with existing modules:

```
app.js (orchestrator)
  │
  ├── [existing] state.js, ui.js, bot.js, deck.js, etc.
  │
  ├── [new] firebase-config.js
  │     └── initFirebase(), signInAnonymously(), onConnectionChange()
  │
  ├── [new] online.js
  │     └── createRoom(), joinRoom(), leaveRoom(), quickMatch()
  │     └── listenToRoom() — real-time listener on room document
  │
  ├── [new] online-host.js
  │     └── hostGame() — creates state, writes to Firebase
  │     └── listenForMoves() — validates guest intents via state.js
  │     └── syncStateToFirebase() — writes after each valid move
  │     └── handleGuestDisconnect() — 30s timer, bot takeover
  │
  └── [new] online-guest.js
        └── guestGame() — listens for state updates from Firebase
        └── sendMove() — writes intent to moves array
        └── renderFromHostState() — updates UI from synced state
```

**Unchanged**: state.js, ui.js, bot.js, sounds.js, animations.js, deck.js, constants.js, stats.js, pwa.js
**Modified**: app.js (branch online flow), service-worker.js (new assets), index.html (Firebase CDN)
**Disabled for online**: persistence.js (Firebase is source of truth)

## Game Flow

### Room Creation (Host)
1. Host clicks "Create Room"
2. signInAnonymously() -> get UID
3. Generate room code, write room doc to Firestore (status: "waiting")
4. Show room code on screen, "waiting for opponent..."
5. listenToRoom() — watch for player[1] to appear
6. When guest joins -> status: "playing", create game state, write to Firebase
7. Start game — host plays locally, syncs every state change

### Room Joining (Guest)
1. Guest enters room code, clicks "Join"
2. signInAnonymously() -> get UID
3. Read room doc — verify status is "waiting" and room exists
4. Write self into players map (index: 1)
5. listenToRoom() — watch for gameState updates
6. When host starts game -> receive initial state, render hand
7. On my turn -> send move intent, wait for host to validate and sync

### Turn Flow (Online)

Host's turn:
1. Host clicks card -> playCard() locally (same as current code)
2. Host writes updated gameState to Firebase
3. Guest receives update via onSnapshot -> renders new state

Guest's turn:
1. Guest clicks card -> sendMove({ type: "play", cardId }) to Firebase
2. Host receives move via onSnapshot on moves array
3. Host validates with playCard() from state.js
4. If valid -> host writes updated gameState
5. Guest receives update -> renders
6. If invalid -> host ignores, guest re-syncs to correct state

### Disconnect and Reconnect
1. Player goes offline -> Firestore presence: connected = false, lastSeen = now
2. Other player sees "opponent disconnected" banner, 30s countdown
3. If player reconnects within 30s: re-authenticate (UID persists), rejoin listener, resume
4. If timeout -> bot takes over disconnected player
5. Host disconnect: guest sees countdown, if timeout game ends (no one to run logic)

### Quick Match
1. Player clicks "Quick Match"
2. Query Firestore: rooms where status == "waiting", ordered by createdAt
3. If found -> join that room
4. If none found -> create a new room, wait for opponent
5. If no one joins within 15s -> start with bot

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomCode} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.hostId == request.auth.uid;
      allow update: if request.auth != null
                    && request.auth.uid in resource.data.players;
    }
  }
}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Host disconnects | Guest sees countdown. If timeout, game ends. Guest returns to menu. |
| Guest disconnects | Host sees countdown. If timeout, bot replaces guest. Host finishes game. |
| Both disconnect | Room expires via TTL (2h). Ignored by quick match query. |
| Invalid move from guest | Host validates with state.js, ignores bad moves. Guest re-syncs. |
| Room code collision | 6-char alphanumeric (~900M combinations). Check existence before create. |
| Guest joins after game started | Rejected — room status is "playing". |
| Tab hidden | visibilitychange -> update lastSeen. When visible, re-sync from Firebase. |
| Stale rooms | Quick match filters createdAt > now - 2h. |

## Implementation Phases

### Phase 1 — Firebase Setup
1. Add Firebase SDK via CDN in index.html
2. Create js/firebase-config.js — init, anonymous auth, connection tracking
3. Set up Firebase project (console.firebase.google.com)
4. Add Firestore security rules

### Phase 2 — Room Lifecycle (js/online.js)
5. createRoom() — write room doc, listen for guest
6. joinRoom() — validate room, add self to players
7. quickMatch() — query waiting rooms, join or create
8. leaveRoom() — cleanup on exit
9. Waiting screen UI — show room code, "waiting for opponent" state

### Phase 3 — Host Logic (js/online-host.js)
10. hostGame() — create game state, write to Firebase
11. listenForMoves() — watch guest intents, validate with state.js
12. syncStateToFirebase() — write sanitized state after each move
13. Guest disconnect detection — 30s timer, bot fallback

### Phase 4 — Guest Logic (js/online-guest.js)
14. guestGame() — listen for state updates
15. sendMove() — write play/draw/lastCard intents
16. State reconciliation — re-render on every host update
17. Host disconnect detection — countdown, return to menu

### Phase 5 — Wire into app.js
18. Branch handleStartButton() for online mode
19. Replace stub handlers (handleQuickMatch, handleCreateRoom, handleJoinRoom)
20. Disable persistence for online games
21. Update service-worker.js ASSETS for new files

### Phase 6 — Polish
22. Connection status indicator in game UI
23. "Opponent thinking..." indicator
24. Reconnect banner with countdown
25. Test on two devices/tabs
