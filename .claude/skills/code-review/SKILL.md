# Code Review Skill — Tsivoni

## When to use
Before merging any feature branch or after significant changes.

## Checklist
1. **RTL correctness** — verify all new UI flows right-to-left; no hardcoded `left`/`right` without logical properties
2. **Hebrew strings** — all user-facing text in Hebrew; no English leaking into UI
3. **State purity** — `state.js` functions return new objects; no direct mutation of game state
4. **Service worker** — if new files added, verify they are listed in `service-worker.js` ASSETS array
5. **Accessibility** — new interactive elements have `aria-label`; announcements use `aria-live` region
6. **Color-blind** — new color-coded elements include shape indicators from `COLOR_SHAPES`
7. **localStorage** — schema version bumped if persistence format changes
8. **No external deps** — no new npm runtime dependencies (Capacitor is build-only)
9. **CSS consolidation** — no duplicate selectors; legacy green-felt styles not reintroduced
10. **Mobile-first** — test at 320px width; touch targets >= 44px
