# Runbook: Troubleshooting

## Stale Cache / Old Version Showing
1. Open DevTools → Application → Service Workers
2. Click "Unregister" on the active service worker
3. Clear site data: Application → Storage → "Clear site data"
4. Reload the page

## Game State Corrupted
1. Open DevTools → Application → Local Storage
2. Delete `tsivoni_save` key
3. Reload — game will start fresh

## Tests Failing
1. Open `tests/test.html` in browser
2. Check console for detailed error messages
3. Tests use a custom runner (`tests/runner.js`) — not Node-based
4. Each test file is a self-contained module with assertions

## Service Worker Not Updating
- Ensure `CACHE_NAME` was bumped (e.g., `tsivoni-v4` → `tsivoni-v5`)
- Check that `skipWaiting()` is called in install handler
- In DevTools, check "Update on reload" checkbox during development

## Audio Not Playing
- Web Audio API requires a user gesture before first play
- Check that `sounds.js` initializes AudioContext on first user interaction
- Some mobile browsers block audio until explicit user tap
