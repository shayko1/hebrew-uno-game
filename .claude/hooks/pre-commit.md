# Pre-Commit Checks

## Automated checks to run before committing

1. **Service worker sync** — verify all JS files in `js/` are listed in `service-worker.js` ASSETS
2. **No console.log** — ensure no debug `console.log` statements left in production code
3. **Hebrew validation** — spot-check that new user-facing strings are in Hebrew
4. **Test pass** — all tests in `tests/` should pass
