'use strict';

/**
 * main.js — Entry point
 *
 * Load order (defined in index.html):
 *   pieces.js → rules.js → board.js → game.js → ui.js → main.js
 */

document.addEventListener('DOMContentLoaded', () => {
  Game.init();
  UI.init();
});
