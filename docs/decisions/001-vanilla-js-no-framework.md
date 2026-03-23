# ADR-001: Vanilla JS with No Framework

## Status
Accepted

## Context
The game is a simple card game targeting casual players. The audience is Hebrew-speaking kids and families. The app needs to be fast, offline-capable, and lightweight.

## Decision
Use vanilla JavaScript with ES modules. No React, Vue, or other framework. No build tools (webpack, vite, etc.).

## Consequences
- **Positive**: Zero bundle size overhead, instant load, no build step, easy to deploy as static files
- **Positive**: No dependency maintenance burden, no security vulnerabilities from npm packages
- **Negative**: Manual DOM manipulation (mitigated by clean `ui.js` module)
- **Negative**: No component model (acceptable for a 4-screen app)
