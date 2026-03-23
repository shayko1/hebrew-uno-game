# ADR-002: localStorage for Game Persistence

## Status
Accepted

## Context
Players may accidentally close the browser or navigate away mid-game. The game should resume where they left off.

## Decision
Use localStorage with JSON serialization and schema versioning. Auto-save on every state change. Auto-load on page open.

## Consequences
- **Positive**: No server needed, works offline, instant save/load
- **Positive**: Schema versioning allows graceful migration
- **Negative**: ~5MB storage limit (more than sufficient for card game state)
- **Negative**: Data is per-browser, not synced across devices
