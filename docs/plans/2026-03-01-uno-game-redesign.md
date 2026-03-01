# Hebrew UNO Game Redesign

## Overview

Complete redesign of the Hebrew UNO card game from a static card display into a fully playable, kid-friendly single-player game against 3 bot opponents. Target audience: ages 6-9. Vanilla HTML/CSS/JS, no frameworks, deployed on GitHub Pages.

## Game Layout

Full-screen green felt card-table background. Four players arranged around the table:

- **Bottom**: Player's hand in a fan/arc shape (CSS transforms)
- **Left, Top, Right**: 3 bot opponents showing face-down card backs with count badges
- **Center**: Draw pile (clickable), discard pile (shows last played card), direction arrow, turn indicator
- **UNO Button**: Appears when player has 2 cards remaining

## Card Design

Rounded rectangle cards (120x180px):

- UNO colors: Red #FF5555, Blue #5555FF, Green #55AA55, Yellow #FFAA00
- Large centered Hebrew number on white oval (signature UNO style)
- Small corner numbers (top-left, bottom-right rotated)
- Special card icons: Skip, Reverse, Draw Two, Wild, Wild Draw Four
- Card back: dark pattern with UNO branding
- Hover: card lifts (translateY -15px) with glow shadow
- Playable cards glow; unplayable cards dim

## Animations & Feedback

- Card play: 400ms ease-out slide from hand to discard
- Card draw: slide from draw pile to hand
- Bot plays: 0.5-1s thinking delay, card flip + slide
- Skip/Reverse: icon flies across screen
- Draw Two/Four: cards visually stack onto next player
- Win: CSS confetti particles, flash, "!כל הכבוד" message
- UNO call: bouncing "!UNO" text popup
- Turn glow shifts between players
- Hand re-fans smoothly on size change

## Game Logic

Full UNO rules:

- 108-card deck (19 per color 0-9, 2x Skip/Reverse/Draw Two per color, 4 Wilds, 4 Wild Draw Fours)
- 7 cards dealt to each player
- Match by color OR number/symbol, or play Wild
- Click draw pile to draw; option to play drawn card if legal
- Special cards: Skip, Reverse, Draw Two, Wild (color picker), Wild Draw Four
- UNO button at 2 cards; penalty +2 if forgotten
- Win: first to empty hand

## Bot AI

Simple strategy:
1. Prioritize matching color
2. Use action cards strategically (skip/reverse when beneficial)
3. Save Wilds for when no other play exists
4. Auto-call UNO

## Color Picker (Wild Cards)

Overlay with 4 large colored circles (red, blue, green, yellow). Bounce animation on hover. Kid taps to choose next color.

## Game Flow

1. Welcome screen: title "משחק UNO", animated Play button, floating card decorations
2. Game round plays until someone wins
3. Win/Lose screen: confetti for win, encouraging "!נסה שוב" for loss, Play Again button
4. No scoring system (simple win/lose per round)

## Tech

- Vanilla HTML/CSS/JS, no framework, no build step
- CSS animations + requestAnimationFrame
- CSS Grid/Flexbox layout
- Responsive: tablet + desktop (min 768px, landscape optimized)
- No external dependencies

## Research Sources

- [UNO Game Development Guide](https://vocal.media/gamers/uno-game-development-the-ultimate-2025-guide)
- [UX Design for Kids - Ramotion](https://www.ramotion.com/blog/ux-design-for-kids/)
- [UX Design for Children - Eleken](https://www.eleken.co/blog-posts/ux-design-for-children-how-to-create-a-product-children-will-love)
- [Designing for Kids - Ungrammary](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps)
- [UI/UX Design Tips for Children - AufaitUX](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)
- [CSS Card Fan Layout](https://medium.com/@leferreyra/first-blog-building-an-interactive-card-fan-with-css-c79c9cd87a14)
- [Official UNO Rules](https://www.unorules.com/)
- [Game Psychology & Reward Loops](https://www.gamedeveloper.com/design/compulsion-loops-dopamine-in-games-and-gamification)
- [Kids Color Palettes](https://colorhunt.co/palettes/kids)
