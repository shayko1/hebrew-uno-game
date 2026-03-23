# Runbook: Deploy to Production

## Trigger
Push to `main` branch.

## Automated Steps (GitHub Actions)
1. Checkout code
2. Configure GitHub Pages
3. Upload all files as artifact
4. Deploy to GitHub Pages

## Pre-Deploy Checklist
- [ ] Bump `CACHE_NAME` in `service-worker.js` if any assets changed
- [ ] Verify all JS files are in `service-worker.js` ASSETS array
- [ ] Run tests locally (`tests/test.html`)
- [ ] Test on mobile device or emulator

## Verify After Deploy
1. Visit live URL
2. Open DevTools → Application → Service Workers → confirm new version activates
3. Check Console for errors
4. Test offline mode (disconnect network, reload)

## Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main
# GitHub Actions will redeploy automatically
```
