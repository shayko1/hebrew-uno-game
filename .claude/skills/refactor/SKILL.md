# Refactor Skill — Tsivoni

## When to use
When restructuring or cleaning up existing code without changing behavior.

## Guidelines
1. **Preserve module boundaries** — keep the separation: state logic in `state.js`, DOM in `ui.js`, orchestration in `app.js`
2. **No new dependencies** — this is a zero-dependency vanilla JS project; keep it that way
3. **Test coverage** — run existing tests after refactoring; add tests for any extracted functions
4. **CSS cleanup** — when touching styles, remove any unused selectors; keep single-file approach
5. **Constants** — extract magic values to `constants.js`
6. **Hebrew strings** — keep all user-facing text centralized and in Hebrew
7. **Backward compatibility** — localStorage saves must remain loadable after refactor
