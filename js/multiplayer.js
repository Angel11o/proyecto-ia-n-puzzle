/** Coordenadas de origen usadas por la transición al modo multijugador. */
let mpIntroFrom = null;

const mpToggleBtn = document.getElementById("mp-toggle");
const mpSectionEl = document.getElementById("mp-section");
const mpTimerEl = document.getElementById("mp-timer");
const mpPlayerEls = [0, 1].map((player) => document.getElementById(`mp-player-${player}`));
const mpBoardEls = [0, 1].map((player) => document.getElementById(`mp-board-${player}`));
const mpMovesEls = [0, 1].map((player) => document.getElementById(`mp-moves-${player}`));
const mpResultEls = [0, 1].map((player) => document.getElementById(`mp-result-${player}`));

/** Mapa de teclas para cada jugador; la dirección describe el movimiento de la ficha. */
const MP_KEYS = [
  { w: "up", s: "down", a: "left", d: "right" },
  { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right" },
];

/** Muestra el cronómetro de la carrera. */
function mpUpdateTimerDisplay() {
  mpTimerEl.textContent = `Tiempo: ${formatTime(mp.timerRunning ? Date.now() - mp.timerStartedAt : mp.timerElapsedMs)}`;
}

/** Arranca el cronómetro de la carrera (con el primer movimiento de cualquiera). */
function mpStartTimer() {
  if (mp.timerRunning) return;
  mp.timerRunning = true;
  mp.timerStartedAt = Date.now() - mp.timerElapsedMs;
  mp.timerIntervalId = setInterval(mpUpdateTimerDisplay, 250);
}

/** Detiene el cronómetro conservando el tiempo acumulado. */
function mpStopTimer() {
  if (!mp.timerRunning) return;
  mp.timerElapsedMs = Date.now() - mp.timerStartedAt;
  mp.timerRunning = false;
  clearInterval(mp.timerIntervalId);
  mp.timerIntervalId = null;
  mpUpdateTimerDisplay();
}

/** Reinicia el cronómetro a cero. */
function mpResetTimer() {
  clearInterval(mp.timerIntervalId);
  mp.timerIntervalId = null;
  mp.timerRunning = false;
  mp.timerStartedAt = null;
  mp.timerElapsedMs = 0;
  mpUpdateTimerDisplay();
}

/** Inicializa ambos jugadores con el mismo tablero y sin ganador. */
function mpStart() {
  mp.boards = [[...board], [...board]];
  mp.moves = [0, 0];
  mp.winner = null;
  mp.lastDisplayed = [null, null];
  mpResetTimer();
}

/** Aplica localmente un movimiento válido para no añadir latencia a la carrera. */
function mpMove(player, index) {
  if (!mp.active || mp.winner !== null || isLoadingGame || isNameModalOpen()) return;
  const playerBoard = mp.boards[player];
  if (!isValidBoard(playerBoard, size)) return;
  const emptyIndex = playerBoard.indexOf(0);
  if (!getAdjacentIndices(emptyIndex, size).includes(index)) return;
  if (!mp.timerRunning && mp.moves[0] + mp.moves[1] === 0) mpStartTimer();
  [playerBoard[emptyIndex], playerBoard[index]] = [playerBoard[index], playerBoard[emptyIndex]];
  mp.moves[player]++;
  const won = playerBoard.every((value, position) => value === goal[position]);
  if (won) { mp.winner = player; mpStopTimer(); }
  renderMp();
  if (won) {
    submitScore("mp", {
      timeMs: mp.timerElapsedMs,
      moves: mp.moves[player],
      boardSize: size,
      fallbackName: `Jugador ${player + 1}`,
      who: `¡Gana el Jugador ${player + 1}!`,
    });
  }
}

/** Convierte una dirección de teclado en la ficha adyacente que debe moverse. */
function mpMoveByKey(player, direction) {
  const playerBoard = mp.boards[player];
  if (!isValidBoard(playerBoard, size)) return;
  const index = tileIndexForKey(playerBoard.indexOf(0), direction, size);
  if (index >= 0) mpMove(player, index);
}

/** Renderiza ambos tableros y el resultado actual de la carrera. */
function renderMp() {
  statusEl.classList.remove("solved");
  mpUpdateTimerDisplay();
  const isReady = isValidBoard(mp.boards[0], size) && isValidBoard(goal, size);
  for (let player = 0; player < 2; player++) {
    const element = mpBoardEls[player];
    const previous = mp.lastDisplayed[player]?.size === size ? mp.lastDisplayed[player] : null;
    const previousRects = new Map();
    if (previous) element.querySelectorAll(".tile[data-value]").forEach((tile) => previousRects.set(tile.dataset.value, tile.getBoundingClientRect()));
    element.innerHTML = "";
    mpPlayerEls[player].classList.toggle("winner", mp.winner === player);
    mpPlayerEls[player].classList.toggle("loser", mp.winner !== null && mp.winner !== player);
    mpMovesEls[player].textContent = `Movimientos: ${mp.moves[player]}`;
    mpResultEls[player].textContent = mp.winner === null ? "" : mp.winner === player ? "¡Ganaste!" : "Perdiste";
    if (!isReady) continue;
    element.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    mp.boards[player].forEach((value, index) => {
      const tile = document.createElement("div");
      tile.className = `tile${value === 0 ? " empty" : ""}`;
      if (value !== 0) {
        tile.textContent = value;
        tile.dataset.value = value;
        tile.addEventListener("click", () => mpMove(player, index));
      }
      element.appendChild(tile);
    });
    if (previous) animateSlide(element, previous.cells, mp.boards[player], previousRects);
    mp.lastDisplayed[player] = { size, cells: [...mp.boards[player]] };
  }
  if (!isReady && !isLoadingGame) statusEl.textContent = "No hay una partida cargada. Pulsa «Nuevo juego» para reintentar.";
  else if (mp.winner !== null) { statusEl.textContent = `¡El Jugador ${mp.winner + 1} gana la carrera! Pulsa «Nuevo juego» para la revancha.`; statusEl.classList.add("solved"); }
  else if (isReady) statusEl.textContent = `Carrera ${size} x ${size} — J1: W A S D · J2: flechas (o clic en las fichas)`;
  if (isReady && mpIntroFrom) { const from = mpIntroFrom; mpIntroFrom = null; playMpIntro(from); }
}

/** Activa o desactiva la carrera, preservando el tablero visible al salir. */
function toggleMultiplayer() {
  if (isLoadingGame || isNameModalOpen()) return;
  const turnOn = !mp.active;
  const canAnimateExit = !turnOn && isValidBoard(mp.boards[0], size);
  const exitItems = canAnimateExit ? mpMakeClones() : null;
  if (canAnimateExit) board = [...mp.boards[0]];
  mpResetTimer();
  if (turnOn) {
    cancelSolveRequest();
    pausePlayback();
    if (solution) board = [...solution.states[animIndex]];
    solution = null;
    solvePanelEl.hidden = true;
    mpIntroFrom = boardEl.getBoundingClientRect();
    mp.boards = [[], []]; mp.moves = [0, 0]; mp.winner = null; mp.lastDisplayed = [null, null];
  }
  mp.active = turnOn;
  document.body.classList.toggle("mp-mode", turnOn);
  mpSectionEl.hidden = !turnOn;
  const label = turnOn ? "Desactivar modo multijugador" : "Activar modo multijugador";
  mpToggleBtn.setAttribute("aria-pressed", String(turnOn));
  mpToggleBtn.setAttribute("aria-label", label);
  mpToggleBtn.title = label;
  if (turnOn) {
    const canReuse = isValidBoard(board, size) && isValidBoard(goal, size) && !board.every((value, index) => value === goal[index]);
    if (canReuse) { mpStart(); renderMp(); } else newGame();
  } else { mpIntroFrom = null; lastDisplayed = null; render(); if (exitItems) playMpExit(exitItems); }
}

/** Crea copias flotantes para animar la salida sin alterar el diseño. */
function mpMakeClones() {
  return mpPlayerEls.map((element, index) => {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    Object.assign(clone.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", zIndex: String(5 - index), pointerEvents: "none" });
    document.body.appendChild(clone);
    return { clone, rect };
  });
}

/** Fusiona visualmente los paneles multijugador con el tablero individual. */
function playMpExit(items) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { items.forEach(({ clone }) => clone.remove()); return; }
  const target = boardEl.getBoundingClientRect();
  const targetX = target.left + target.width / 2;
  const targetY = target.top + target.height / 2;
  items.forEach(({ clone, rect }) => {
    const dx = targetX - (rect.left + rect.width / 2);
    const dy = targetY - (rect.top + rect.height / 2);
    const scale = rect.width ? target.width / rect.width : 1;
    clone.animate([{ transform: "translate(0px, 0px) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    const fade = clone.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 650, easing: "linear", fill: "forwards" });
    fade.onfinish = () => clone.remove();
  });
}

/** Expande el tablero individual en los dos paneles de la carrera. */
function playMpIntro(from) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  mpPlayerEls.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const dx = fromX - (rect.left + rect.width / 2);
    const dy = fromY - (rect.top + rect.height / 2);
    const scale = rect.width ? from.width / rect.width : 1;
    element.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "translate(0px, 0px) scale(1)" }], { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" });
  });
}