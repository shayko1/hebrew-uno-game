# Security Policy

## Project Scope

Tsivoni is a client-side-only PWA card game with no backend server, no user authentication, and no sensitive data collection. All data is stored in the browser's localStorage.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | Yes |
| Older deployments | No |

## Reporting a Vulnerability

If you discover a security issue, please report it by opening a GitHub issue or emailing the maintainer directly.

**Response time**: We aim to respond within 7 days.

## Security Considerations

### Client-Side Storage
- Game state and statistics are stored in `localStorage` only
- No personally identifiable information (PII) is collected or stored
- localStorage data never leaves the browser

### Service Worker
- Cache-first strategy for offline play
- Only caches assets from the same origin (`/hebrew-uno-game/` path)
- No external API calls or third-party scripts

### Content Security
- No inline scripts in HTML (except minimal service worker registration)
- No external CDN dependencies — all code is first-party
- No user-generated content rendered as HTML (XSS-safe)
- No dynamic code execution — no Function constructor or similar patterns

### Dependencies
- **Zero runtime dependencies** — no npm packages in production bundle
- Capacitor is dev/build-only for native shell generation
- GitHub Actions deployment uses official GitHub actions only

### PWA / Manifest
- `scope` is restricted to `/hebrew-uno-game/`
- No permissions requested beyond standard web APIs (Web Audio)

## Best Practices for Contributors
- Do not add external runtime dependencies
- Do not use `innerHTML` with user-controlled data
- Do not store sensitive information in localStorage
- Keep the service worker ASSETS list in sync with actual files
- Do not add analytics or tracking scripts without explicit consent
- Avoid dynamic code execution patterns
