'use strict';

/**
 * pieces.js — Piece definitions, Unicode symbols, metadata
 */
const Pieces = (() => {

  // White = outline glyphs, Black = filled glyphs
  // Both styled via CSS to match our color theme
  const SYMBOLS = {
    white: { king:'♔', queen:'♕', rook:'♖', bishop:'♗', knight:'♘', pawn:'♙' },
    black: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
  };

  const VALUES = { pawn:1, knight:3, bishop:3, rook:5, queen:9, king:0 };

  const DISPLAY_NAMES = {
    king:'King', queen:'Queen', rook:'Rook', bishop:'Bishop', knight:'Knight', pawn:'Pawn'
  };

  // Pieces a pawn can promote to, in preferred display order
  const PROMOTION_TYPES = ['queen', 'rook', 'bishop', 'knight'];

  // Algebraic notation letters
  const NOTATION_LETTER = { king:'K', queen:'Q', rook:'R', bishop:'B', knight:'N', pawn:'' };

  return {
    getSymbol(piece)    { return SYMBOLS[piece.color][piece.type]; },
    getValue(type)      { return VALUES[type] ?? 0; },
    getName(type)       { return DISPLAY_NAMES[type] ?? type; },
    getLetter(type)     { return NOTATION_LETTER[type] ?? '?'; },
    PROMOTION_TYPES,
    SYMBOLS,
  };

})();
