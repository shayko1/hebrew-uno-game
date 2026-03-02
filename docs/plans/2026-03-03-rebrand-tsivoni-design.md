# Rebrand: UNO → צבעוני! (Tsivoni!) — Design

**Goal:** Remove all UNO/Mattel trademark references and rebrand the game with an original name for App Store publishing.

**New Name:** צבעוני! (Tsivoni! — "Colorful!" in Hebrew)

---

## What Was Done

### Branding Changes
- Game title: "UNO" → "צבעוני!"
- Card backs: "UNO" → "צבעוני"
- Last card call: "!UNO" → "!אחרון" (Last!)
- Welcome subtitle: "משחק הקלפים המוכר והאהוב" → kept as-is (generic)
- App description: Updated in manifest.json

### Code Changes
- HTML IDs: `uno-btn` → `last-card-btn`
- CSS classes: `.btn-uno` → `.btn-last-card`, `.uno-popup` → `.last-card-popup`
- CSS animations: `pulseUno` → `pulseLastCard`, `unoBounce` → `lastCardBounce`
- JS functions: `soundUno` → `soundLastCard`, `showUnoPopup` → `showLastCardPopup`, `handleUnoCall` → `handleLastCardCall`
- State property: `unoCalledBy` → `lastCardCalledBy`
- localStorage keys: `uno_visits` → `tsivoni_visits`, `uno_game_stats` → `tsivoni_game_stats`
- Service worker cache: `uno-game-v4` → `tsivoni-v1`
- Comments: Removed all "Official UNO" references

### What's NOT Trademarked (kept as-is)
- Game mechanics (color matching, number matching, skip, reverse, draw two, wild cards)
- The 4-color scheme (red, blue, green, yellow)
- 108-card deck structure
- All gameplay rules

---

## Still Needed for App Store Publishing

### 1. New App Icons (Required)
Current icons still have old UNO branding. Need new icons:
- `icon-180.png` (iOS touch icon)
- `icon-192.png` (Android PWA)
- `icon-512.png` (PWA splash)
- Additional sizes for App Store: 1024x1024 (iOS), 512x512 (Play Store)

### 2. App Store Wrapper (Required)
Choose one:
- **Capacitor** (recommended): Full native wrapper, more App Store control
- **PWABuilder**: Simpler, generates packages from PWA

### 3. App Store Requirements
- **Apple Developer Account**: $99/year
- **Privacy Policy URL**: Required even for no-data-collection games
- **App Store Description**: Hebrew + English
- **Screenshots**: 6.5" and 5.5" iPhone sizes minimum
- **Age Rating**: 4+ (no objectionable content)
- **Category**: Games > Card

### 4. Optional: Rename GitHub Repository
Current repo: `hebrew-uno-game` → could rename to `tsivoni-game`
This would change the GitHub Pages URL.
