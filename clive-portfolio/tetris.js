/* =========================================================
   tetris.js — a small, self-contained Tetris clone for the
   Playground section. No libraries, plain canvas + JS.
   Scores are saved to Supabase via saveScore()/fetchLeaderboard()
   in supabase.js.
   ========================================================= */
(function () {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 22;
  const DROP_MS = 650;

  const COLORS = {
    I: "#4fd1ff",
    O: "#3b7bff",
    T: "#a78bfa",
    S: "#22c55e",
    Z: "#f87171",
    J: "#6366f1",
    L: "#fb923c"
  };

  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]]
  };
  const PIECE_KEYS = Object.keys(SHAPES);

  let canvas, ctx, overlay, scoreEl, linesEl, leaderboardList;
  let board, current, score, lines, dropTimer, running;

  function init() {
    canvas = document.getElementById("tetris-canvas");
    if (!canvas) return; // this page has no Playground section

    ctx = canvas.getContext("2d");
    overlay = document.getElementById("game-overlay");
    scoreEl = document.getElementById("game-score");
    linesEl = document.getElementById("game-lines");
    leaderboardList = document.getElementById("leaderboard-list");

    document.getElementById("game-start-btn").addEventListener("click", startGame);
    document.addEventListener("keydown", handleKey);
    document.querySelectorAll(".game-controls-mobile button").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });

    renderLeaderboard();
    board = emptyBoard();
    draw();
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const shape = SHAPES[key].map((row) => row.slice());
    return {
      key,
      shape,
      color: COLORS[key],
      row: 0,
      col: Math.floor((COLS - shape[0].length) / 2)
    };
  }

  function collide(testBoard, piece, offRow, offCol, testShape) {
    const shape = testShape || piece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const boardRow = piece.row + r + offRow;
        const boardCol = piece.col + c + offCol;
        if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) return true;
        if (boardRow >= 0 && testBoard[boardRow][boardCol]) return true;
      }
    }
    return false;
  }

  function merge() {
    current.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const boardRow = current.row + r;
          const boardCol = current.col + c;
          if (boardRow >= 0) board[boardRow][boardCol] = current.color;
        }
      });
    });
  }

  function getFullRows() {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every((cell) => cell)) rows.push(r);
    }
    return rows;
  }

  function removeRows(rows) {
    rows
      .slice()
      .sort((a, b) => b - a)
      .forEach((r) => {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
      });
  }

  function applyScore(count) {
    const points = [0, 100, 300, 500, 800][count] || count * 200;
    if (points <= 0) return;

    score += points;
    lines += count;
    scoreEl.textContent = score;
    linesEl.textContent = lines;

    // 1. Popping animation on the scoreboard counter and floating bubble
    triggerScoreStatPop(scoreEl, points);

    // 2. Popping animation on lines counter
    if (linesEl && count > 0) {
      triggerStatPop(linesEl);
    }

    // 3. Popping animation on the game board
    showBoardScorePopup(points, count);
  }

  function triggerScoreStatPop(el, points) {
    if (!el) return;
    el.classList.remove("pop");
    void el.offsetWidth; // force DOM reflow so animation restarts every score
    el.classList.add("pop");

    const parentStat = el.closest(".game-stat") || el.parentElement;
    if (parentStat) {
      // Remove any prior floating bubble in this stat
      parentStat.querySelectorAll(".stat-score-bubble").forEach((b) => b.remove());
      const bubble = document.createElement("span");
      bubble.className = "stat-score-bubble";
      bubble.textContent = "+" + points;
      parentStat.appendChild(bubble);
      setTimeout(() => bubble.remove(), 850);
    }
  }

  function triggerStatPop(el) {
    if (!el) return;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function showBoardScorePopup(points, count) {
    if (!points || !canvas || !canvas.parentElement) return;
    const boardWrap = canvas.parentElement;

    // Remove existing popups to prevent stacking
    boardWrap.querySelectorAll(".score-popup-container").forEach((p) => p.remove());

    const popup = document.createElement("div");
    popup.className = "score-popup-container";
    if (count === 4) popup.classList.add("is-tetris");

    let tierLabel = "";
    if (count === 2) tierLabel = "DOUBLE!";
    else if (count === 3) tierLabel = "TRIPLE!";
    else if (count === 4) tierLabel = "TETRIS!";

    popup.innerHTML = `
      <div class="score-popup-ring"></div>
      <div class="score-popup-card">
        ${tierLabel ? `<span class="score-popup-label">${tierLabel}</span>` : ""}
        <span class="score-popup-points">+${points}</span>
      </div>
      <div class="score-sparks" aria-hidden="true">
        <span class="spark s1"></span>
        <span class="spark s2"></span>
        <span class="spark s3"></span>
        <span class="spark s4"></span>
        <span class="spark s5"></span>
        <span class="spark s6"></span>
      </div>
    `;

    boardWrap.appendChild(popup);

    // Subtle tactile micro-shake on the board for impact
    boardWrap.classList.remove("board-impact");
    void boardWrap.offsetWidth;
    boardWrap.classList.add("board-impact");
    setTimeout(() => boardWrap.classList.remove("board-impact"), 320);

    setTimeout(() => popup.remove(), 950);
  }

  function animateClear(rows, done) {
    const FLASHES = 3;
    const STEP_MS = 90;
    let step = 0;
    const tick = () => {
      draw(step % 2 === 0 ? rows : null);
      step++;
      if (step < FLASHES * 2) {
        setTimeout(tick, STEP_MS);
      } else {
        done();
      }
    };
    tick();
  }

  function rotateMatrix(matrix) {
    const n = matrix.length;
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push([]);
      for (let j = 0; j < n; j++) {
        result[i][j] = matrix[n - j - 1][i];
      }
    }
    return result;
  }

  function tryRotate() {
    const rotated = rotateMatrix(current.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collide(board, current, 0, kick, rotated)) {
        current.shape = rotated;
        current.col += kick;
        draw();
        return;
      }
    }
  }

  function move(dc) {
    if (!collide(board, current, 0, dc)) {
      current.col += dc;
      draw();
    }
  }

  function softDrop() {
    if (!collide(board, current, 1, 0)) {
      current.row++;
      draw();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    while (!collide(board, current, 1, 0)) current.row++;
    lockPiece();
  }

  function lockPiece() {
    merge();
    current = null; // already baked into board — stop redrawing it on top of the flash
    const fullRows = getFullRows();

    if (fullRows.length) {
      running = false;
      clearInterval(dropTimer);
      draw();
      animateClear(fullRows, () => {
        removeRows(fullRows);
        applyScore(fullRows.length);
        spawnNext();
      });
      return;
    }

    spawnNext();
  }

  function spawnNext() {
    current = randomPiece();
    if (collide(board, current, 0, 0)) {
      endGame();
      return;
    }
    running = true;
    clearInterval(dropTimer);
    dropTimer = setInterval(() => running && softDrop(), DROP_MS);
    draw();
  }

  function handleAction(action) {
    if (!running) return;
    if (action === "left") move(-1);
    else if (action === "right") move(1);
    else if (action === "down") softDrop();
    else if (action === "rotate") tryRotate();
    else if (action === "drop") hardDrop();
  }

  function handleKey(e) {
    if (!running) return;
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowDown") softDrop();
    else if (e.key === "ArrowUp") tryRotate();
    else if (e.key === " ") hardDrop();
  }

  function draw(flashRows) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }
    board.forEach((row, r) => {
      const flashing = flashRows && flashRows.includes(r);
      row.forEach((color, c) => {
        if (color) drawCell(c, r, flashing ? "#ffffff" : color);
      });
    });
    if (current) {
      current.shape.forEach((row, r) =>
        row.forEach((val, c) => val && drawCell(current.col + c, current.row + r, current.color))
      );
    }
  }

  function drawCell(col, row, color) {
    if (row < 0) return;
    const x = col * CELL, y = row * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
  }

  function startGame() {
    board = emptyBoard();
    score = 0;
    lines = 0;
    scoreEl.textContent = "0";
    linesEl.textContent = "0";
    scoreEl.classList.remove("pop");
    linesEl.classList.remove("pop");
    if (canvas && canvas.parentElement) {
      canvas.parentElement.querySelectorAll(".score-popup-container").forEach((p) => p.remove());
      const statRow = scoreEl.closest(".game-stat") || scoreEl.parentElement;
      if (statRow) statRow.querySelectorAll(".stat-score-bubble").forEach((b) => b.remove());
    }
    overlay.classList.add("hidden");
    current = randomPiece();
    running = true;
    draw();
    clearInterval(dropTimer);
    dropTimer = setInterval(() => running && softDrop(), DROP_MS);
  }

  function endGame() {
    running = false;
    clearInterval(dropTimer);
    overlay.innerHTML = `
      <p class="game-overlay-title">Game Over</p>
      <p class="game-overlay-sub">Score: ${score}</p>
      <form id="game-save-form" class="game-save-form">
        <input type="text" id="game-player-name" placeholder="Your name" maxlength="20" required>
        <button type="submit" class="btn btn-pill btn-light">Save Score</button>
      </form>
      <button class="btn btn-pill btn-outline" id="game-retry-btn" type="button">Play Again</button>
    `;
    overlay.classList.remove("hidden");
    document.getElementById("game-save-form").addEventListener("submit", onSaveScore);
    document.getElementById("game-retry-btn").addEventListener("click", startGame);
  }

  async function onSaveScore(e) {
    e.preventDefault();
    const input = document.getElementById("game-player-name");
    const name = input.value.trim();
    if (!name) return;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    const { error, isNewBest, bestScore } = await saveScore({ player_name: name, score });
    btn.disabled = false;
    const sub = document.querySelector(".game-overlay-sub");
    if (error) {
      if (sub) sub.textContent = "Couldn't save — is Supabase connected?";
      return;
    }
    input.value = "";
    if (sub) {
      sub.textContent = isNewBest
        ? `Saved — ${score} points!`
        : `Your best is still ${bestScore} — close one!`;
    }
    renderLeaderboard();
  }

  async function renderLeaderboard() {
    if (!leaderboardList) return;
    const { data, error } = await fetchLeaderboard(5);
    if (error || !data || data.length === 0) {
      leaderboardList.innerHTML = `<li class="leaderboard-empty">No scores yet — be the first.</li>`;
      return;
    }
    leaderboardList.innerHTML = data
      .map((row) => `<li><span>${escapeHtmlSafe(row.player_name)}</span><strong>${row.score}</strong></li>`)
      .join("");
  }

  function escapeHtmlSafe(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
