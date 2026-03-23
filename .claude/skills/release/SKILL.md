# Release Skill — Tsivoni

## When to use
Before deploying a new version to GitHub Pages.

## Steps
1. **Update service worker cache version** — bump `CACHE_NAME` in `service-worker.js` (e.g., `tsivoni-v4` → `tsivoni-v5`)
2. **Verify ASSETS array** — ensure all JS modules and assets are listed in `service-worker.js`
3. **Run tests** — open `tests/test.html` in browser, verify all suites pass
4. **Test on mobile** — verify touch interactions, RTL layout, landscape orientation
5. **Check localStorage migration** — if persistence schema changed, verify old saves load correctly
6. **Commit and push to main** — GitHub Actions deploys automatically
7. **Verify deployment** — check live URL, confirm new cache version activates
