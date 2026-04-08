'use strict';

/**
 * rules.js — Chess move-generation and validation engine
 *
 * Board convention:
 *   board[0][0] = a8 (black's queen-rook at start)
 *   board[7][7] = h1 (white's king-rook at start)
 *   row 0 = rank 8, row 7 = rank 1
 *   col 0 = file a, col 7 = file h
 *
 * Piece objects: { type: string, color: 'white'|'black' }
 *
 * Move objects:
 *   { from: {row,col}, to: {row,col},
 *     castling?:    'kingside'|'queenside',
 *     enPassant?:   true,
 *     isPromotion?: true,
 *     promoteTo?:   string }
 *
 * State objects (minimal, passed around):
 *   { castling: { white:{kingside,queenside}, black:{kingside,queenside} },
 *     enPassant: {row,col} | null }
 */

const Rules = (() => {

  /* ── Helpers ──────────────────────────────────────────────── */

  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const opp = color => color === 'white' ? 'black' : 'white';

  function cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  /* ── Attack square generation ─────────────────────────────── */

  // Returns all squares [r, c] that the piece at (row, col) attacks.
  // This is used for check detection — it does NOT filter for legality.
  function attacksFrom(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    const { type, color } = piece;
    const squares = [];

    if (type === 'pawn') {
      const d = color === 'white' ? -1 : 1;
      for (const dc of [-1, 1]) {
        if (inBounds(row + d, col + dc)) squares.push([row + d, col + dc]);
      }
      return squares;
    }

    if (type === 'knight') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        if (inBounds(row + dr, col + dc)) squares.push([row + dr, col + dc]);
      }
      return squares;
    }

    // Sliding + step directions per type
    const DIRS = {
      rook:   [[0,1],[0,-1],[1,0],[-1,0]],
      bishop: [[1,1],[1,-1],[-1,1],[-1,-1]],
      queen:  [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
      king:   [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
    };
    const sliding = type === 'rook' || type === 'bishop' || type === 'queen';

    for (const [dr, dc] of DIRS[type]) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        squares.push([r, c]);
        if (board[r][c] || !sliding) break; // blocked or step-only
        r += dr; c += dc;
      }
    }

    return squares;
  }

  // Is square (row, col) attacked by any piece of attackerColor?
  function isSquareAttacked(board, row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === attackerColor) {
          if (attacksFrom(board, r, c).some(([ar, ac]) => ar === row && ac === col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Is the king of 'color' currently in check?
  function isInCheck(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'king' && p.color === color) {
          return isSquareAttacked(board, r, c, opp(color));
        }
      }
    }
    return false; // no king found (shouldn't happen)
  }

  /* ── Move application ─────────────────────────────────────── */

  // Returns a new board with the move applied (immutable).
  function applyMove(board, move) {
    const b = cloneBoard(board);
    const { from, to } = move;
    const piece = { ...b[from.row][from.col] };

    b[to.row][to.col] = piece;
    b[from.row][from.col] = null;

    // En passant: remove the captured pawn
    if (move.enPassant) {
      const capRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      b[capRow][to.col] = null;
    }

    // Castling: relocate the rook
    if (move.castling) {
      const rank = piece.color === 'white' ? 7 : 0;
      if (move.castling === 'kingside') {
        b[rank][5] = { ...b[rank][7] };
        b[rank][7] = null;
      } else {
        b[rank][3] = { ...b[rank][0] };
        b[rank][0] = null;
      }
    }

    // Promotion: replace pawn with chosen piece
    if (move.promoteTo) {
      b[to.row][to.col] = { type: move.promoteTo, color: piece.color };
    }

    return b;
  }

  /* ── Pseudo-legal move generation ────────────────────────── */
  // Generates moves that are geometrically valid but may leave own king in check.

  function pseudoMovesFor(board, row, col, state) {
    const piece = board[row][col];
    if (!piece) return [];
    const { type, color } = piece;
    const moves = [];

    /* ── Pawn ── */
    if (type === 'pawn') {
      const d = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      const promoRow = color === 'white' ? 0 : 7;

      // One step forward
      if (inBounds(row + d, col) && !board[row + d][col]) {
        moves.push({
          from: { row, col }, to: { row: row + d, col },
          isPromotion: (row + d) === promoRow,
        });
        // Two steps forward from starting rank
        if (row === startRow && !board[row + 2 * d][col]) {
          moves.push({ from: { row, col }, to: { row: row + 2 * d, col } });
        }
      }

      // Diagonal captures + en passant
      for (const dc of [-1, 1]) {
        const nr = row + d, nc = col + dc;
        if (!inBounds(nr, nc)) continue;

        const target = board[nr][nc];
        if (target && target.color !== color) {
          moves.push({
            from: { row, col }, to: { row: nr, col: nc },
            isPromotion: nr === promoRow,
          });
        }

        // En passant capture
        const ep = state.enPassant;
        if (ep && ep.row === nr && ep.col === nc) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, enPassant: true });
        }
      }

      return moves;
    }

    /* ── Knight ── */
    if (type === 'knight') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = row + dr, nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        const t = board[nr][nc];
        if (!t || t.color !== color) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc } });
        }
      }
      return moves;
    }

    /* ── King ── */
    if (type === 'king') {
      const enemy = opp(color);
      const rank = color === 'white' ? 7 : 0;

      // Regular one-square moves
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nr = row + dr, nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        const t = board[nr][nc];
        if (!t || t.color !== color) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc } });
        }
      }

      // Castling — king must not currently be in check
      if (!isSquareAttacked(board, row, col, enemy)) {
        const castling = state.castling[color];

        // Kingside: f-file (5) and g-file (6) empty and unattacked
        if (castling.kingside) {
          const rook = board[rank][7];
          if (rook && rook.type === 'rook' && rook.color === color &&
              !board[rank][5] && !board[rank][6] &&
              !isSquareAttacked(board, rank, 5, enemy) &&
              !isSquareAttacked(board, rank, 6, enemy)) {
            moves.push({ from: { row, col }, to: { row: rank, col: 6 }, castling: 'kingside' });
          }
        }

        // Queenside: b-file (1), c-file (2), d-file (3) empty; c+d unattacked
        if (castling.queenside) {
          const rook = board[rank][0];
          if (rook && rook.type === 'rook' && rook.color === color &&
              !board[rank][1] && !board[rank][2] && !board[rank][3] &&
              !isSquareAttacked(board, rank, 3, enemy) &&
              !isSquareAttacked(board, rank, 2, enemy)) {
            moves.push({ from: { row, col }, to: { row: rank, col: 2 }, castling: 'queenside' });
          }
        }
      }

      return moves;
    }

    /* ── Sliding pieces: rook, bishop, queen ── */
    const DIRS = {
      rook:   [[0,1],[0,-1],[1,0],[-1,0]],
      bishop: [[1,1],[1,-1],[-1,1],[-1,-1]],
      queen:  [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
    };

    for (const [dr, dc] of DIRS[type]) {
      let nr = row + dr, nc = col + dc;
      while (inBounds(nr, nc)) {
        const t = board[nr][nc];
        if (!t) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc } });
        } else {
          if (t.color !== color) {
            moves.push({ from: { row, col }, to: { row: nr, col: nc } });
          }
          break; // blocked
        }
        nr += dr; nc += dc;
      }
    }

    return moves;
  }

  /* ── Legal move filtering ─────────────────────────────────── */

  // Returns only moves that do NOT leave the own king in check.
  function getLegalMoves(board, row, col, state) {
    const piece = board[row][col];
    if (!piece) return [];

    return pseudoMovesFor(board, row, col, state).filter(move => {
      // For promotion moves test with queen (any promotion has same board footprint for check)
      const testMove = move.isPromotion ? { ...move, promoteTo: 'queen' } : move;
      const newBoard = applyMove(board, testMove);
      return !isInCheck(newBoard, piece.color);
    });
  }

  // Returns all legal moves for every piece of 'color'.
  function getAllLegalMoves(board, color, state) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          moves.push(...getLegalMoves(board, r, c, state));
        }
      }
    }
    return moves;
  }

  /* ── Game-end detection ───────────────────────────────────── */

  function isCheckmate(board, color, state) {
    return isInCheck(board, color) && getAllLegalMoves(board, color, state).length === 0;
  }

  function isStalemate(board, color, state) {
    return !isInCheck(board, color) && getAllLegalMoves(board, color, state).length === 0;
  }

  /* ── State helpers ────────────────────────────────────────── */

  // Update castling rights after a move.
  function updateCastling(castling, piece, move) {
    const c = {
      white: { ...castling.white },
      black: { ...castling.black },
    };

    if (piece.type === 'king') {
      c[piece.color].kingside  = false;
      c[piece.color].queenside = false;
    }

    if (piece.type === 'rook') {
      const homeRank = piece.color === 'white' ? 7 : 0;
      if (move.from.row === homeRank) {
        if (move.from.col === 7) c[piece.color].kingside  = false;
        if (move.from.col === 0) c[piece.color].queenside = false;
      }
    }

    // If an enemy rook on its starting square is captured, revoke that side's castling
    if (move.to.row === 0 && move.to.col === 0) c.black.queenside = false;
    if (move.to.row === 0 && move.to.col === 7) c.black.kingside  = false;
    if (move.to.row === 7 && move.to.col === 0) c.white.queenside = false;
    if (move.to.row === 7 && move.to.col === 7) c.white.kingside  = false;

    return c;
  }

  // Compute the en passant target square after a two-square pawn advance.
  function getEnPassantTarget(piece, move) {
    if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      return {
        row: (move.from.row + move.to.row) / 2,
        col: move.from.col,
      };
    }
    return null;
  }

  /* ── Algebraic Notation ───────────────────────────────────── */

  // Builds standard algebraic notation for a move, given all legal moves
  // available at the time (needed for disambiguation).
  function toAlgebraic(board, move, allLegalMoves) {
    const piece = board[move.from.row][move.from.col];
    if (!piece) return '?';

    if (move.castling === 'kingside')  return 'O-O';
    if (move.castling === 'queenside') return 'O-O-O';

    const FILES = 'abcdefgh';
    const RANKS = '87654321';
    const toSq   = FILES[move.to.col]   + RANKS[move.to.row];
    const fromFile = FILES[move.from.col];
    const fromRank = RANKS[move.from.row];

    const isCapture = board[move.to.row][move.to.col] !== null || !!move.enPassant;

    if (piece.type === 'pawn') {
      let n = isCapture ? `${fromFile}x${toSq}` : toSq;
      if (move.promoteTo) {
        n += '=' + Pieces.getLetter(move.promoteTo);
      }
      return n;
    }

    const letter = Pieces.getLetter(piece.type);

    // Disambiguation: find other pieces of the same type that can reach the same square
    const siblings = (allLegalMoves || []).filter(m =>
      !(m.from.row === move.from.row && m.from.col === move.from.col) &&
      board[m.from.row]?.[m.from.col]?.type  === piece.type &&
      board[m.from.row]?.[m.from.col]?.color === piece.color &&
      m.to.row === move.to.row && m.to.col === move.to.col
    );

    let disambig = '';
    if (siblings.length > 0) {
      const sameFile = siblings.some(m => m.from.col === move.from.col);
      const sameRank = siblings.some(m => m.from.row === move.from.row);
      if (!sameFile)         disambig = fromFile;
      else if (!sameRank)    disambig = fromRank;
      else                   disambig = fromFile + fromRank;
    }

    return `${letter}${disambig}${isCapture ? 'x' : ''}${toSq}`;
  }

  /* ── Public API ───────────────────────────────────────────── */

  return {
    getLegalMoves,
    getAllLegalMoves,
    isInCheck,
    isCheckmate,
    isStalemate,
    applyMove,
    updateCastling,
    getEnPassantTarget,
    toAlgebraic,
    cloneBoard,
  };

})();
