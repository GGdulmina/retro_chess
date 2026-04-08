'use strict';

/**
 * game.js — Game flow: state management, move execution, history
 *
 * Manages the canonical game state and exposes methods consumed by ui.js.
 */

const Game = (() => {

  /* ── Initial state factory ────────────────────────────────── */

  function makeInitialState() {
    return {
      board: Board.createInitial(),
      turn:  'white',

      // Castling availability per color and side
      castling: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },

      // En passant target square (or null)
      enPassant: null,

      // Move history — array of move-record objects
      moveHistory: [],

      // Pieces captured by each side (array of type strings)
      capturedPieces: { white: [], black: [] },

      // Game status
      status: 'playing', // 'playing' | 'check' | 'checkmate' | 'stalemate'
    };
  }

  /* ── Module state ─────────────────────────────────────────── */

  let _state = null;

  /* ── Public API ───────────────────────────────────────────── */

  function init() {
    _state = makeInitialState();
    return _state;
  }

  function getState() {
    return _state;
  }

  // Returns legal moves from (row, col) for the current player — or [] if none.
  function getLegalMovesFromSquare(row, col) {
    if (!_state) return [];
    const piece = _state.board[row][col];
    if (!piece || piece.color !== _state.turn) return [];
    return Rules.getLegalMoves(_state.board, row, col, _state);
  }

  // Execute a validated move object and advance game state.
  // Returns the updated state.
  function executeMove(move) {
    const { board, turn, castling, moveHistory, capturedPieces } = _state;
    const piece    = board[move.from.row][move.from.col];
    const captured = board[move.to.row][move.to.col];

    // Snapshot all legal moves before applying (for algebraic disambiguation)
    const allMoves = Rules.getAllLegalMoves(board, turn, _state);
    const notation = Rules.toAlgebraic(board, move, allMoves);

    // Apply the move
    const newBoard     = Rules.applyMove(board, move);
    const newCastling  = Rules.updateCastling(castling, piece, move);
    const newEnPassant = Rules.getEnPassantTarget(piece, move);

    // Update captured pieces
    const newCaptured = {
      white: [...capturedPieces.white],
      black: [...capturedPieces.black],
    };
    if (captured)      newCaptured[turn].push(captured.type);
    if (move.enPassant) newCaptured[turn].push('pawn');

    const nextTurn  = turn === 'white' ? 'black' : 'white';
    const nextState = { castling: newCastling, enPassant: newEnPassant };

    // Determine game status after move
    let status = 'playing';
    if (Rules.isCheckmate(newBoard, nextTurn, nextState)) {
      status = 'checkmate';
    } else if (Rules.isStalemate(newBoard, nextTurn, nextState)) {
      status = 'stalemate';
    } else if (Rules.isInCheck(newBoard, nextTurn)) {
      status = 'check';
    }

    // Build move record for history
    const record = {
      move,
      notation,
      piece:     { ...piece },
      captured:  captured ? { ...captured } : null,
      check:     status === 'check',
      checkmate: status === 'checkmate',
      stalemate: status === 'stalemate',
    };

    _state = {
      board:          newBoard,
      turn:           nextTurn,
      castling:       newCastling,
      enPassant:      newEnPassant,
      moveHistory:    [...moveHistory, record],
      capturedPieces: newCaptured,
      status,
    };

    return _state;
  }

  function reset() {
    _state = makeInitialState();
    return _state;
  }

  return {
    init,
    getState,
    getLegalMovesFromSquare,
    executeMove,
    reset,
  };

})();
