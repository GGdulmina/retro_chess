# RETRO_♟_CHESS 

![Project Status](https://img.shields.io/badge/Status-Completed-success) ![Technologies](https://img.shields.io/badge/Tech-HTML%20|%20CSS%20|%20JavaScript-blue)

A **fully functional, browser-based chess game** — no frameworks, no backend, no dependencies. Built for **clean gameplay, responsive design, and professional UI/UX**.

---
## Quick Start

Open `index.html` in any modern browser. No server required.

---

## Features

### Core Rules
- Legal move validation for all piece types  
- Check & checkmate detection  
- Stalemate detection  
- Castling — kingside and queenside  
- En passant  
- Pawn promotion (choose queen, rook, bishop, or knight)  
- Turn-based play (white vs black)  

### User Interface
- Click to select a piece, click to move  
- Visual move highlighting:  
  - Dots for empty squares (legal moves)  
  - Rings for capture targets  
  - Highlighted selected square  
- Check indicator (pulsing red on the king)  
- Move history panel with algebraic notation (including `+` and `#`)  
- Captured pieces display  
- Board flip option (play from black’s perspective)  
- New Game button  
- Pawn promotion modal  

---

## Theme / UI

Inspired by **Chess.com Dark Mode**, adapted with navy and cream tones:

| Element          | Color / Value            |
|-----------------|-------------------------|
| Page background | `#312e2b`              |
| Dark squares    | `#739552`               |
| Light squares   | `#ebecd0`               |
| White pieces    | `#ffffff`               |
| Black pieces    | `#000000`               |
| Move highlight  | yellow, 50% α           |
| Selected square | yellow, 50% α           |
| Capture ring    | translucent black       |
| Check indicator | red, 80% α              |
| Panels & status | `#262421` (dark panel) |
| Buttons         | accent `#81b64c`, secondary `#363431` |

Additional details:
- Fully responsive board — squares and pieces scale for tablets and mobile.  
- Pieces use **text-stroke and drop shadows** for contrast and depth.  
- Promotion modal, move history, and controls match the dark mode aesthetic.  

---

## File Structure


chess-project/
├── index.html           # Entry point
├── README.md
├── css/
│   └── styles.css       # Dark navy/cream theme, responsive layout
└── js/
    ├── pieces.js        # Piece symbols, values, metadata
    ├── rules.js         # Move generation, check detection, all special rules
    ├── board.js         # Board creation and initial layout
    ├── game.js          # Game state, move execution, history
    ├── ui.js            # DOM rendering and event handling
    └── main.js          # Bootstrap (DOMContentLoaded)

---

## Architecture


pieces.js ──► rules.js (pure logic, no DOM)
board.js ──► │
▼
game.js (state machine)
│
▼
ui.js (all DOM rendering)
│
main.js (entry point)


- `rules.js` is **stateless and functional** — inputs: board + state; outputs: results only.  
- `game.js` manages the **canonical game state** and exposes an immutable-update API.  
- `ui.js` updates the DOM based on `game.js` state.  
- `main.js` initializes the game on page load.

---

## Extending the Game

- **AI Opponent** — Add `ai.js` using `Rules.getAllLegalMoves(board, 'black', state)` with **minimax + alpha-beta pruning**.  
- **Timers** — Add `clock.js` to count down per-player time, integrated with `Game.executeMove()`.  
- **Persistence** — Save game state to `localStorage` after each move.  
- **Undo/Redo** — Maintain a **state history array** and implement `undo()` / `redo()`.  
- **Move Notation Export** — Export `state.moveHistory` in **PGN format**.

---

## License

— free to use, modify, and share.

---

**Note:** The UI theme is **inspired by Chess.com Dark Mode**
