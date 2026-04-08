'use strict';

/**
 * board.js — Board representation helpers
 *
 * The board is an 8×8 array: board[row][col]
 * row 0 = rank 8 (black's side), row 7 = rank 1 (white's side)
 * col 0 = file a,               col 7 = file h
 */

const Board = (() => {

  function makeBackRank(color) {
    const types = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
    return types.map(type => ({ type, color }));
  }

  function makePawnRank(color) {
    return Array.from({ length: 8 }, () => ({ type: 'pawn', color }));
  }

  function makeEmptyRank() {
    return Array.from({ length: 8 }, () => null);
  }

  // Build a fresh starting board
  function createInitial() {
    return [
      makeBackRank('black'),   // row 0 — rank 8
      makePawnRank('black'),   // row 1 — rank 7
      makeEmptyRank(),         // row 2 — rank 6
      makeEmptyRank(),         // row 3 — rank 5
      makeEmptyRank(),         // row 4 — rank 4
      makeEmptyRank(),         // row 5 — rank 3
      makePawnRank('white'),   // row 6 — rank 2
      makeBackRank('white'),   // row 7 — rank 1
    ];
  }

  return { createInitial };

})();
