(() => {
  const anchor = document.querySelector(".family-collab") || document.querySelector(".dashboard");
  if (!anchor) return;

  const section = document.createElement("section");
  section.className = "family-games v3-surface";
  section.id = "familyGames";
  section.innerHTML = `
    <header class="game-room-head">
      <div class="game-room-title"><span class="arcade-mark">123</span><div><span class="game-kicker">FAMILY ARCADE · MINI FEATURE</span><h2>Play together. Think sharper.</h2><p>Four quick number games for friendly family breaks between saving goals.</p></div></div>
      <div class="room-presence"><div class="room-code"><small>LIVE ROOM</small><b>BB-2048</b></div><div class="online-family"><span>D</span><span>M</span><span>Y</span><span>B</span><i></i></div></div>
    </header>
    <div class="game-score-strip"><span><i>⚡</i><small>FAMILY SCORE</small><b id="familyGameScore">0 XP</b></span><span><i>👑</i><small>THIS WEEK</small><b>You lead</b></span><span><i>●</i><small>ROOM STATUS</small><b class="live-copy">4 online</b></span><button id="copyRoomCode" type="button">Copy room code ↗</button></div>
    <div class="game-picker" role="tablist" aria-label="Family number games">
      <button class="game-choice active" data-game="sudoku" type="button"><span>▦</span><b>Mini Sudoku</b><small>4 × 4 logic</small><em>+80 XP</em></button>
      <button class="game-choice" data-game="xo" type="button"><span>×○</span><b>Tic-Tac-Toe</b><small>Family turns</small><em>LIVE</em></button>
      <button class="game-choice" data-game="hunt" type="button"><span>?</span><b>Number Hunt</b><small>1 to 100</small><em>HOT / COLD</em></button>
      <button class="game-choice" data-game="duel" type="button"><span>⚡</span><b>Math Rush</b><small>30-sec duel</small><em>FAST</em></button>
    </div>
    <div class="game-stage">
      <section class="game-panel active" data-panel="sudoku">
        <div class="game-copy"><span class="panel-number">01</span><span class="game-kicker">CALM FOCUS</span><h3>Mini Sudoku</h3><p>Fill every row, column, and 2 × 2 box with the numbers 1–4.</p><div class="game-meta"><span>Difficulty <b>Easy</b></span><span>Reward <b>80 XP</b></span></div><button class="game-main-btn" id="checkSudoku" type="button">Check my grid</button><button class="game-text-btn" id="resetSudoku" type="button">Reset puzzle</button><p class="game-feedback" id="sudokuFeedback" aria-live="polite">Tap an empty tile to cycle through 1–4.</p></div>
        <div class="sudoku-shell"><div class="sudoku-board" id="sudokuBoard" aria-label="4 by 4 Sudoku board"></div><div class="board-glow"></div></div>
      </section>
      <section class="game-panel" data-panel="xo">
        <div class="game-copy"><span class="panel-number">02</span><span class="game-kicker">LIVE FAMILY TURNS</span><h3>Tic-Tac-Toe</h3><p>The shared board syncs instantly between open Family Goal pages.</p><div class="turn-pill"><i></i><span id="xoTurn">Your turn · X</span></div><div class="xo-score"><span>You <b id="xoYouScore">0</b></span><em>VS</em><span>Family <b id="xoFamilyScore">0</b></span></div><button class="game-text-btn" id="resetXo" type="button">New round</button><p class="game-feedback" id="xoFeedback" aria-live="polite">Choose any open tile.</p></div>
        <div class="xo-shell"><div class="xo-board" id="xoBoard" aria-label="Tic tac toe board"></div><div class="xo-watermark">BB</div></div>
      </section>
      <section class="game-panel" data-panel="hunt">
        <div class="game-copy"><span class="panel-number">03</span><span class="game-kicker">FAMILY NUMBER HUNT</span><h3>Find the hidden number</h3><p>Budget Buddy picked a number from 1 to 100. Follow the warmer and colder clues.</p><div class="hunt-range"><span>1</span><div><i id="huntMeter"></i></div><span>100</span></div><form class="hunt-form" id="huntForm"><input id="huntInput" type="number" min="1" max="100" inputmode="numeric" aria-label="Your number guess" placeholder="Your guess"><button type="submit">Guess ↗</button></form><p class="game-feedback" id="huntFeedback" aria-live="polite">No guesses yet. Who wants to go first?</p></div>
        <div class="hunt-visual"><div class="hunt-orbit"><span class="hunt-core">?</span><i></i><i></i><i></i></div><div class="attempt-list" id="huntAttempts"></div><button class="game-text-btn" id="newHunt" type="button">Choose a new number</button></div>
      </section>
      <section class="game-panel" data-panel="duel">
        <div class="game-copy"><span class="panel-number">04</span><span class="game-kicker">QUICK MATH DUEL</span><h3>Math Rush</h3><p>Answer as many number challenges as you can before the thirty-second pulse ends.</p><div class="duel-stats"><span><small>TIME</small><b id="duelTime">30s</b></span><span><small>SCORE</small><b id="duelScore">0</b></span><span><small>STREAK</small><b id="duelStreak">0×</b></span></div><button class="game-main-btn" id="startDuel" type="button">Start 30-second rush</button><p class="game-feedback" id="duelFeedback" aria-live="polite">Every correct answer earns 10 XP.</p></div>
        <div class="duel-arena"><div class="duel-ring"><div><small>SOLVE</small><strong id="duelQuestion">8 + 7</strong></div></div><div class="duel-answers" id="duelAnswers"></div></div>
      </section>
    </div>`;
  anchor.insertAdjacentElement("afterend", section);

  const stateKey = "budgetBuddyFamilyArcadeV1";
  const defaultState = { scores: { sudoku: 0, xoYou: 0, xoFamily: 0, hunt: 0, duel: 0 }, xo: Array(9).fill(""), xoTurn: "X", huntSecret: Math.floor(Math.random() * 100) + 1, huntAttempts: [] };
  let state;
  try { state = { ...defaultState, ...JSON.parse(localStorage.getItem(stateKey) || "{}") }; } catch { state = structuredClone(defaultState); }
  state.scores = { ...defaultState.scores, ...(state.scores || {}) };
  state.xo = Array.isArray(state.xo) && state.xo.length === 9 ? state.xo : Array(9).fill("");
  state.huntAttempts = Array.isArray(state.huntAttempts) ? state.huntAttempts : [];
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("budget-buddy-family-arcade") : null;

  const totalScore = () => state.scores.sudoku + state.scores.xoYou * 50 + state.scores.xoFamily * 50 + state.scores.hunt + state.scores.duel;
  function persist(broadcast = true) {
    localStorage.setItem(stateKey, JSON.stringify(state));
    if (broadcast) channel?.postMessage(state);
    renderScores();
  }
  function applyRemote(next) {
    if (!next || typeof next !== "object") return;
    state = next;
    renderScores(); renderXo(); renderHunt(); renderSudoku();
  }
  channel?.addEventListener("message", event => applyRemote(event.data));
  addEventListener("storage", event => { if (event.key === stateKey && event.newValue) { try { applyRemote(JSON.parse(event.newValue)); } catch {} } });

  const toast = message => typeof showToast === "function" ? showToast(message) : (() => { section.querySelector(".live-copy").textContent = message; setTimeout(() => section.querySelector(".live-copy").textContent = "4 online", 2200); })();
  section.querySelectorAll(".game-choice").forEach(button => button.addEventListener("click", () => {
    section.querySelectorAll(".game-choice").forEach(item => item.classList.toggle("active", item === button));
    section.querySelectorAll(".game-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === button.dataset.game));
  }));
  section.querySelector("#copyRoomCode").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText("BB-2048"); toast("Family room code copied"); } catch { toast("Room code: BB-2048"); }
  });

  function renderScores() {
    section.querySelector("#familyGameScore").textContent = `${totalScore()} XP`;
    section.querySelector("#xoYouScore").textContent = state.scores.xoYou;
    section.querySelector("#xoFamilyScore").textContent = state.scores.xoFamily;
  }

  // Mini Sudoku
  const puzzle = [1,0,0,4, 0,4,1,0, 0,1,4,0, 4,0,0,1];
  const solution = [1,2,3,4, 3,4,1,2, 2,1,4,3, 4,3,2,1];
  if (!Array.isArray(state.sudoku) || state.sudoku.length !== 16) state.sudoku = [...puzzle];
  const sudokuBoard = section.querySelector("#sudokuBoard");
  function renderSudoku() {
    sudokuBoard.replaceChildren();
    state.sudoku.forEach((value, index) => {
      const cell = document.createElement("button");
      cell.type = "button"; cell.textContent = value || ""; cell.className = puzzle[index] ? "fixed" : "";
      cell.setAttribute("aria-label", `Row ${Math.floor(index/4)+1}, column ${index%4+1}${value ? `, ${value}` : ", empty"}`);
      if (!puzzle[index]) cell.addEventListener("click", () => { state.sudoku[index] = (Number(state.sudoku[index]) % 4) + 1; persist(); renderSudoku(); });
      sudokuBoard.append(cell);
    });
  }
  section.querySelector("#checkSudoku").addEventListener("click", () => {
    const complete = state.sudoku.every((value, index) => value === solution[index]);
    const feedback = section.querySelector("#sudokuFeedback");
    if (complete) { if (!state.scores.sudoku) state.scores.sudoku = 80; feedback.textContent = "Perfect grid! Your family earned 80 XP."; feedback.className = "game-feedback success"; persist(); toast("Sudoku complete · +80 XP"); }
    else { const wrong = state.sudoku.filter((value, index) => value && value !== solution[index]).length; feedback.textContent = wrong ? `${wrong} tile${wrong > 1 ? "s" : ""} need another look.` : "Good start — fill every empty tile."; feedback.className = "game-feedback warn"; }
  });
  section.querySelector("#resetSudoku").addEventListener("click", () => { state.sudoku = [...puzzle]; persist(); renderSudoku(); section.querySelector("#sudokuFeedback").textContent = "Puzzle reset. Take it one box at a time."; });

  // Tic-tac-toe
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const xoBoard = section.querySelector("#xoBoard");
  const xoWinner = () => wins.find(line => state.xo[line[0]] && state.xo[line[0]] === state.xo[line[1]] && state.xo[line[1]] === state.xo[line[2]]);
  function renderXo() {
    xoBoard.replaceChildren(); const winning = xoWinner();
    state.xo.forEach((value, index) => {
      const cell = document.createElement("button"); cell.type = "button"; cell.textContent = value; cell.className = value ? value.toLowerCase() : "";
      if (winning?.includes(index)) cell.classList.add("winner");
      cell.setAttribute("aria-label", `Tic tac toe tile ${index+1}${value ? `, ${value}` : ", empty"}`);
      cell.addEventListener("click", () => playXo(index)); xoBoard.append(cell);
    });
    section.querySelector("#xoTurn").textContent = state.xoTurn === "X" ? "Your turn · X" : "Family turn · O";
    const feedback = section.querySelector("#xoFeedback");
    if (winning) feedback.textContent = `${state.xo[winning[0]] === "X" ? "You" : "Family"} won this round!`;
    else if (state.xo.every(Boolean)) feedback.textContent = "A thoughtful draw. Start another round!";
    else feedback.textContent = `${state.xoTurn === "X" ? "You are" : "A family member is"} choosing the next tile.`;
  }
  function playXo(index) {
    if (state.xo[index] || xoWinner()) return;
    state.xo[index] = state.xoTurn; state.xoTurn = state.xoTurn === "X" ? "O" : "X";
    const winning = xoWinner();
    if (winning) winning && state.xo[winning[0]] === "X" ? state.scores.xoYou++ : state.scores.xoFamily++;
    persist(); renderXo();
  }
  section.querySelector("#resetXo").addEventListener("click", () => { state.xo = Array(9).fill(""); state.xoTurn = state.scores.xoYou <= state.scores.xoFamily ? "X" : "O"; persist(); renderXo(); });

  // Number Hunt
  const attemptsList = section.querySelector("#huntAttempts");
  function renderHunt() {
    attemptsList.replaceChildren();
    state.huntAttempts.slice(-5).reverse().forEach(guess => { const chip = document.createElement("span"); chip.textContent = guess; chip.className = guess === state.huntSecret ? "found" : guess < state.huntSecret ? "low" : "high"; attemptsList.append(chip); });
    section.querySelector("#huntMeter").style.width = `${Math.min(100, state.huntAttempts.length * 14)}%`;
  }
  section.querySelector("#huntForm").addEventListener("submit", event => {
    event.preventDefault(); const input = section.querySelector("#huntInput"); const guess = Number(input.value); if (!Number.isInteger(guess) || guess < 1 || guess > 100) return;
    state.huntAttempts.push(guess); const difference = Math.abs(guess - state.huntSecret); const feedback = section.querySelector("#huntFeedback");
    if (guess === state.huntSecret) { const reward = Math.max(20, 100 - (state.huntAttempts.length - 1) * 10); state.scores.hunt += reward; feedback.textContent = `Found it! ${state.huntSecret} was the number · +${reward} XP`; feedback.className = "game-feedback success"; toast(`Number found · +${reward} XP`); }
    else { const direction = guess < state.huntSecret ? "Go higher" : "Go lower"; const heat = difference <= 5 ? "Very hot!" : difference <= 15 ? "Warm." : difference <= 30 ? "Cool." : "Cold."; feedback.textContent = `${heat} ${direction}.`; feedback.className = `game-feedback ${difference <= 15 ? "warn" : ""}`; }
    input.value = ""; persist(); renderHunt();
  });
  section.querySelector("#newHunt").addEventListener("click", () => { state.huntSecret = Math.floor(Math.random() * 100) + 1; state.huntAttempts = []; persist(); renderHunt(); section.querySelector("#huntFeedback").textContent = "A new hidden number is ready."; });

  // Math Rush
  let duelTimer = null, duelTime = 30, duelScore = 0, duelStreak = 0, duelAnswer = 15;
  const answerBox = section.querySelector("#duelAnswers");
  function nextQuestion() {
    const a = Math.floor(Math.random() * 18) + 2, b = Math.floor(Math.random() * 12) + 2, multiply = Math.random() > .72;
    duelAnswer = multiply ? a * b : a + b; section.querySelector("#duelQuestion").textContent = `${a} ${multiply ? "×" : "+"} ${b}`;
    const options = new Set([duelAnswer]); while (options.size < 4) options.add(Math.max(1, duelAnswer + Math.floor(Math.random() * 13) - 6));
    answerBox.replaceChildren(); [...options].sort(() => Math.random() - .5).forEach(value => { const button = document.createElement("button"); button.type = "button"; button.textContent = value; button.addEventListener("click", () => answerDuel(value, button)); answerBox.append(button); });
  }
  function answerDuel(value, button) {
    if (!duelTimer) return;
    if (value === duelAnswer) { duelScore += 10; duelStreak++; button.classList.add("correct"); section.querySelector("#duelFeedback").textContent = `Correct · ${duelStreak} answer streak!`; setTimeout(nextQuestion, 160); }
    else { duelStreak = 0; button.classList.add("wrong"); section.querySelector("#duelFeedback").textContent = "Close — reset and keep moving."; }
    section.querySelector("#duelScore").textContent = duelScore; section.querySelector("#duelStreak").textContent = `${duelStreak}×`;
  }
  section.querySelector("#startDuel").addEventListener("click", () => {
    if (duelTimer) return; duelTime = 30; duelScore = 0; duelStreak = 0; nextQuestion();
    const start = section.querySelector("#startDuel"); start.textContent = "Rush in progress…"; start.disabled = true;
    duelTimer = setInterval(() => { duelTime--; section.querySelector("#duelTime").textContent = `${duelTime}s`; if (duelTime <= 0) { clearInterval(duelTimer); duelTimer = null; state.scores.duel = Math.max(state.scores.duel, duelScore); persist(); start.disabled = false; start.textContent = "Play another rush"; section.querySelector("#duelFeedback").textContent = `Time! You added ${duelScore} XP to the family score.`; toast(`Math Rush finished · ${duelScore} XP`); } }, 1000);
  });

  renderScores(); renderSudoku(); renderXo(); renderHunt(); nextQuestion();
})();
