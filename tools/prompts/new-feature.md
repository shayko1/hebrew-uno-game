# Prompt: Add a New Feature

When adding a new feature to Tsivoni, follow this structure:

1. **Which module owns it?** Map the feature to the correct module:
   - Game rules / card logic → `state.js`
   - Visual rendering → `ui.js`
   - Sound effects → `sounds.js`
   - Bot behavior → `bot.js`
   - Wiring / events → `app.js`

2. **Hebrew strings** — add any new user-facing text to `constants.js`

3. **Service worker** — if adding new files, update `service-worker.js` ASSETS array and bump `CACHE_NAME`

4. **Tests** — add tests in the relevant `tests/test-*.js` file

5. **Accessibility** — add `aria-label` to new interactive elements; use `aria-live` for dynamic announcements

6. **Color-blind** — if feature involves color, include shape indicators from `COLOR_SHAPES`
