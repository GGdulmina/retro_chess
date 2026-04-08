'use strict';

/**
 * ui.js — All DOM interactions and rendering
 *
 * Responsibilities:
 *   • Render the board and pieces
 *   • Handle square clicks (select → highlight → move)
 *   • Render move history, captured pieces, game status
 *   • Show promotion modal
 *   • Board flip toggle
 */

const UI = (() => {

  /* ── UI state ─────────────────────────────────────────────── */

  let _selectedSquare  = null;  // { row, col } or null
  let _legalMoves      = [];    // legal moves for selected piece
  let _flipped         = false; // true = board from black's POV
  let _pendingPromotion = null; // move awaiting piece choice

  /* ── Coordinate transform ─────────────────────────────────── */

  // Convert logical (row, col) to display position given flip state
  function toDisplay(row, col) {
    return _flipped
      ? { dr: 7 - row, dc: 7 - col }
      : { dr: row, dc: col };
  }

  // Convert display grid position back to logical (row, col)
  function fromDisplay(dr, dc) {
    return _flipped
      ? { row: 7 - dr, col: 7 - dc }
      : { row: dr, col: dc };
  }

  /* ── Render: board ────────────────────────────────────────── */

  function renderBoard() {
    const el    = document.getElementById('chess-board');
    const state = Game.getState();
    el.innerHTML = '';

    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const { row, col } = fromDisplay(dr, dc);
        const sq = document.createElement('div');
        sq.className = 'square';
        sq.dataset.row = row;
        sq.dataset.col = col;

        // Base square color — classic board: (row+col)%2===0 → light
        sq.classList.add((row + col) % 2 === 0 ? 'sq-light' : 'sq-dark');

        // Selection highlight
        if (_selectedSquare && _selectedSquare.row === row && _selectedSquare.col === col) {
          sq.classList.add('sq-selected');
        }

        // Legal-move overlays
        const isTarget = _legalMoves.some(m => m.to.row === row && m.to.col === col);
        if (isTarget) {
          const occupied = state.board[row][col] !== null;
          sq.classList.add(occupied ? 'sq-capture' : 'sq-move');
        }

        // Check indicator — highlight the king in check
        const piece = state.board[row][col];
        if (piece && piece.type === 'king' && piece.color === state.turn &&
            (state.status === 'check' || state.status === 'checkmate')) {
          sq.classList.add('sq-check');
        }

        // Place piece
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = `piece piece-${piece.color}`;
          pieceEl.textContent = Pieces.getSymbol(piece);
          pieceEl.setAttribute('aria-label', `${piece.color} ${piece.type}`);
          sq.appendChild(pieceEl);
        }

        sq.addEventListener('click', () => onSquareClick(row, col));
        el.appendChild(sq);
      }
    }
  }

  /* ── Render: coordinates ──────────────────────────────────── */

  function renderCoordinates() {
    const FILES = _flipped ? 'hgfedcba' : 'abcdefgh';
    const RANKS = _flipped ? '12345678' : '87654321';

    const rankEl = document.getElementById('rank-labels');
    rankEl.innerHTML = '';
    for (const r of RANKS) {
      const d = document.createElement('div');
      d.className = 'rank-label';
      d.textContent = r;
      rankEl.appendChild(d);
    }

    const fileEl = document.getElementById('file-labels');
    fileEl.innerHTML = '';
    for (const f of FILES) {
      const d = document.createElement('div');
      d.className = 'file-label';
      d.textContent = f;
      fileEl.appendChild(d);
    }
  }

  /* ── Render: status bar ───────────────────────────────────── */

  function renderStatus() {
    const el    = document.getElementById('game-status');
    const state = Game.getState();
    const turn  = state.turn.toUpperCase();
    const winner = state.turn === 'white' ? 'BLACK' : 'WHITE';

    const msgs = {
      checkmate: `CHECKMATE — ${winner} WINS`,
      stalemate: `STALEMATE — DRAW`,
      check:     `${turn} IS IN CHECK`,
      playing:   `${turn} TO MOVE`,
    };

    el.textContent = msgs[state.status] || msgs.playing;
    el.className   = 'game-status';

    if (state.status === 'checkmate') el.classList.add('status-checkmate');
    else if (state.status === 'check') el.classList.add('status-check');
    else if (state.status === 'stalemate') el.classList.add('status-stalemate');
  }

  /* ── Render: move history ─────────────────────────────────── */

  function renderHistory() {
    const list  = document.getElementById('history-list');
    const moves = Game.getState().moveHistory;
    list.innerHTML = '';

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const row     = document.createElement('div');
      row.className = 'history-row';

      const numEl = document.createElement('span');
      numEl.className = 'move-num';
      numEl.textContent = moveNum + '.';
      row.appendChild(numEl);

      const whiteEl = document.createElement('span');
      whiteEl.className = 'move-white';
      whiteEl.textContent = annotated(moves[i]);
      row.appendChild(whiteEl);

      if (moves[i + 1]) {
        const blackEl = document.createElement('span');
        blackEl.className = 'move-black';
        blackEl.textContent = annotated(moves[i + 1]);
        row.appendChild(blackEl);
      }

      list.appendChild(row);
    }

    list.scrollTop = list.scrollHeight;
  }

  function annotated(record) {
    let n = record.notation;
    if (record.checkmate) n += '#';
    else if (record.check) n += '+';
    return n;
  }

  /* ── Render: captured pieces ──────────────────────────────── */

  function renderCaptured() {
    const state = Game.getState();

    // "white-captured" = pieces captured BY white (i.e. black pieces lost)
    const whiteCap = document.getElementById('white-captured');
    if (whiteCap) {
      whiteCap.innerHTML = state.capturedPieces.white
        .map(t => `<span class="cap-piece">${Pieces.SYMBOLS.black[t]}</span>`)
        .join('');
    }

    // "black-captured" = pieces captured BY black (i.e. white pieces lost)
    const blackCap = document.getElementById('black-captured');
    if (blackCap) {
      blackCap.innerHTML = state.capturedPieces.black
        .map(t => `<span class="cap-piece">${Pieces.SYMBOLS.white[t]}</span>`)
        .join('');
    }
  }

  /* ── Click handler ────────────────────────────────────────── */

  function onSquareClick(row, col) {
    const state = Game.getState();

    // Ignore clicks when game is over or awaiting promotion
    if (state.status === 'checkmate' || state.status === 'stalemate') return;
    if (_pendingPromotion) return;

    // If a piece is selected, try to move
    if (_selectedSquare) {
      const move = _legalMoves.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        if (move.isPromotion) {
          _pendingPromotion = move;
          showPromoModal(state.turn);
        } else {
          commitMove(move);
        }
        return;
      }
    }

    // Select a piece belonging to the active player
    const piece = state.board[row][col];
    if (piece && piece.color === state.turn) {
      // Re-clicking the same square deselects
      if (_selectedSquare && _selectedSquare.row === row && _selectedSquare.col === col) {
        _selectedSquare = null;
        _legalMoves     = [];
      } else {
        _selectedSquare = { row, col };
        _legalMoves     = Game.getLegalMovesFromSquare(row, col);
      }
    } else {
      _selectedSquare = null;
      _legalMoves     = [];
    }

    renderBoard();
  }

  function commitMove(move) {
    Game.executeMove(move);
    _selectedSquare = null;
    _legalMoves     = [];
    render();
  }

  /* ── Promotion modal ──────────────────────────────────────── */

  function showPromoModal(color) {
    const modal   = document.getElementById('promotion-modal');
    const options = document.getElementById('promotion-options');
    options.innerHTML = '';

    for (const type of Pieces.PROMOTION_TYPES) {
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.setAttribute('aria-label', `Promote to ${type}`);
      btn.title = Pieces.getName(type);

      const symbol = document.createElement('span');
      symbol.className = `piece-${color}`;
      symbol.textContent = Pieces.SYMBOLS[color][type];
      btn.appendChild(symbol);

      btn.addEventListener('click', () => {
        const finalMove = { ..._pendingPromotion, promoteTo: type };
        _pendingPromotion = null;
        modal.classList.add('hidden');
        commitMove(finalMove);
      });

      options.appendChild(btn);
    }

    modal.classList.remove('hidden');
  }

  /* ── Full render ──────────────────────────────────────────── */

  function render() {
    renderBoard();
    renderCoordinates();
    renderStatus();
    renderHistory();
    renderCaptured();
  }

  /* ── Init ─────────────────────────────────────────────────── */

  function init() {
    document.getElementById('btn-new-game').addEventListener('click', () => {
      Game.reset();
      _selectedSquare   = null;
      _legalMoves       = [];
      _pendingPromotion = null;
      document.getElementById('promotion-modal').classList.add('hidden');
      render();
    });

    document.getElementById('btn-flip-board').addEventListener('click', () => {
      _flipped = !_flipped;
      render();
    });

    // Close promotion modal if clicking backdrop
    document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      // Don't dismiss — promotion choice is mandatory
    });

    render();
  }

  return { init, render };

})();
