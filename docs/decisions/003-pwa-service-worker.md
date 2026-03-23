# ADR-003: PWA with Cache-First Service Worker

## Status
Accepted

## Context
Target users may play on mobile with unreliable connections. The game should work offline after first visit.

## Decision
Use a service worker with cache-first strategy. All assets are pre-cached on install. Cache version is bumped manually on each release.

## Consequences
- **Positive**: Full offline support after first visit
- **Positive**: Near-instant load from cache on repeat visits
- **Negative**: Manual ASSETS list maintenance in `service-worker.js`
- **Negative**: Cache version must be bumped on every release to push updates
