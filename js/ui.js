/** Aplica el tema visual y actualiza los atributos de accesibilidad. */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  themeToggleBtn.setAttribute("aria-label", label);
  themeToggleBtn.setAttribute("aria-pressed", String(!isDark));
  themeToggleBtn.title = label;
}

/** Alterna entre los temas claro y oscuro. */
function toggleTheme() { applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"); }

/** Muestra un mensaje recuperable en el área de errores. */
function showError(message) { errorEl.textContent = message; errorEl.hidden = false; }

/** Oculta el mensaje de error activo. */
function clearError() { errorEl.textContent = ""; errorEl.hidden = true; }

/** Bloquea controles que no pueden cambiar durante una carga. */
function setControlsBusy(busy) {
  newGameBtn.disabled = busy;
  sizeSelect.disabled = busy;
  modeOptionsEl.querySelectorAll(".mode-option").forEach((button) => { button.disabled = busy; });
}

/** Sincroniza los controles con la última partida cargada correctamente. */
function syncControlsToState() {
  sizeSelect.value = String(size);
  modeOptionsEl.querySelectorAll(".mode-option").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  updateHighlight(modeOptionsEl.querySelector(".mode-option.active"));
}

/** Muestra el tiempo transcurrido mientras el backend busca una solución. */
function startSolveClock() {
  const startedAt = Date.now();
  const tick = () => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    statusEl.textContent = `Resolviendo… ${seconds} s${size >= 4 ? " (los tableros grandes pueden tardar; puedes cancelar)" : ""}`;
  };
  tick();
  solveClockId = setInterval(tick, 1000);
}

/** Detiene el reloj asociado a la solicitud de solución. */
function stopSolveClock() { if (solveClockId) clearInterval(solveClockId); solveClockId = null; }

/** Cancela una búsqueda activa y restablece su estado visual. */
function cancelSolveRequest() {
  if (solveController) solveController.abort();
  solveController = null;
  isSolving = false;
  stopSolveClock();
}

/** Convierte milisegundos a un formato de minutos y segundos. */
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** Actualiza el contador de movimientos y el cronómetro. */
function updateStatsDisplay() {
  moveCounterEl.textContent = `Movimientos: ${moveCount}`;
  timerEl.textContent = `Tiempo: ${formatTime(timerRunning ? Date.now() - timerStartedAt : timerElapsedMs)}`;
}

/** Inicia el cronómetro al confirmar el primer movimiento del jugador. */
function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerStartedAt = Date.now() - timerElapsedMs;
  timerIntervalId = setInterval(updateStatsDisplay, 250);
}

/** Conserva el tiempo acumulado y detiene el cronómetro. */
function stopTimer() {
  if (!timerRunning) return;
  timerElapsedMs = Date.now() - timerStartedAt;
  timerRunning = false;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  updateStatsDisplay();
}

/** Restablece las estadísticas de una partida nueva. */
function resetStats() {
  moveCount = 0;
  timerElapsedMs = 0;
  timerStartedAt = null;
  timerRunning = false;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  updateStatsDisplay();
}

/** Anima sólo la ficha que cambió de posición entre dos estados consecutivos. */
function animateSlide(previousCells, nextCells, previousRects) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const moved = nextCells.filter((value, index) => value !== 0 && previousCells[index] !== value);
  if (moved.length !== 1) return;
  const value = moved[0];
  const oldRect = previousRects.get(String(value));
  const tile = boardEl.querySelector(`.tile[data-value="${value}"]`);
  if (!oldRect || !tile) return;
  const newRect = tile.getBoundingClientRect();
  const dx = oldRect.left - newRect.left;
  const dy = oldRect.top - newRect.top;
  if (dx === 0 && dy === 0) return;
  tile.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: isPlaying ? Math.min(220, speedMs * 0.8) : 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}

/** Renderiza el tablero individual, su estado y sus controles asociados. */
function render() {
  if (mp.active) { renderMp(); return; }
  const displayBoard = solution ? solution.states[animIndex] : board;
  const hasGame = isValidBoard(displayBoard, size) && isValidBoard(goal, size);
  solveBtn.textContent = isSolving ? "Cancelar" : "Resolver";
  if (!hasGame) {
    boardEl.innerHTML = "";
    lastDisplayed = null;
    if (!isLoadingGame) statusEl.textContent = "No hay una partida cargada. Pulsa «Nuevo juego» para reintentar.";
    statusEl.classList.remove("solved");
    solveBtn.disabled = true;
    updateStatsDisplay();
    return;
  }
  const previous = lastDisplayed && lastDisplayed.size === size ? lastDisplayed : null;
  const previousRects = new Map();
  if (previous) boardEl.querySelectorAll(".tile[data-value]").forEach((tile) => previousRects.set(tile.dataset.value, tile.getBoundingClientRect()));
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.innerHTML = "";
  boardEl.classList.toggle("board--preview", Boolean(solution));
  displayBoard.forEach((value, index) => {
    const tile = document.createElement("div");
    tile.className = `tile${value === 0 ? " empty" : ""}`;
    if (value !== 0) {
      tile.textContent = value;
      tile.dataset.value = value;
      if (!solution) tile.addEventListener("click", () => tryMove(index));
    }
    boardEl.appendChild(tile);
  });
  if (previous) animateSlide(previous.cells, displayBoard, previousRects);
  lastDisplayed = { size, cells: [...displayBoard] };
  const solved = displayBoard.every((value, index) => value === goal[index]);
  if (solved) { stopTimer(); statusEl.textContent = "¡Resuelto!"; statusEl.classList.add("solved"); }
  else if (isSolving) statusEl.classList.remove("solved");
  else if (solution) { statusEl.textContent = `Reproduciendo solución — paso ${animIndex} de ${solution.states.length - 1}`; statusEl.classList.remove("solved"); }
  else if (!isLoadingGame) { statusEl.textContent = `Tablero ${size} x ${size} — clic en una ficha junto al espacio vacío para moverla`; statusEl.classList.remove("solved"); }
  solveBtn.disabled = isSolving ? false : Boolean(solution) || solved || moveInFlight || isLoadingGame;
  updateSolveControls();
  updateStatsDisplay();
}

/** Construye la cuadrícula animada de vista previa para un modo. */
function buildModePreview(modeId) {
  const previewSize = 3;
  const previewGoal = goalForMode(modeId, previewSize);
  const delayByIndex = new Array(previewSize * previewSize).fill(0);
  fillOrderForMode(modeId, previewSize).forEach((index, order) => { delayByIndex[index] = order * 0.05; });
  const grid = document.createElement("div");
  grid.className = "mode-preview";
  previewGoal.forEach((value, index) => {
    const cell = document.createElement("div");
    cell.className = `mode-preview-cell${value === 0 ? " empty" : ""}`;
    cell.style.animationDelay = `${delayByIndex[index]}s`;
    if (value !== 0) cell.textContent = value;
    grid.appendChild(cell);
  });
  return grid;
}

/** Reinicia la animación de una vista previa al enfocarla o pasar el cursor. */
function replayPreview(grid) {
  grid.querySelectorAll(".mode-preview-cell").forEach((cell) => {
    const delay = cell.style.animationDelay;
    cell.style.animation = "none";
    void cell.offsetWidth;
    cell.style.animation = "";
    cell.style.animationDelay = delay;
  });
}

/** Alinea el indicador visual con el modo seleccionado. */
function updateHighlight(activeButton) {
  const highlight = document.getElementById("mode-highlight");
  if (!highlight || !activeButton) return;
  highlight.style.width = `${activeButton.offsetWidth}px`;
  highlight.style.transform = `translateX(${activeButton.offsetLeft}px)`;
}

/** Solicita un juego nuevo después de actualizar el modo seleccionado. */
function selectMode(modeId) {
  if (modeId === mode || isLoadingGame) return;
  modeOptionsEl.querySelectorAll(".mode-option").forEach((button) => button.classList.toggle("active", button.dataset.mode === modeId));
  updateHighlight(modeOptionsEl.querySelector(`.mode-option[data-mode="${modeId}"]`));
  newGame(size, modeId);
}

/** Genera los botones del selector de modos y sus vistas previas. */
function buildModeSelector() {
  modeOptionsEl.innerHTML = "";
  const highlight = document.createElement("div");
  highlight.className = "mode-highlight";
  highlight.id = "mode-highlight";
  modeOptionsEl.appendChild(highlight);
  MODES.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-option${item.id === mode ? " active" : ""}`;
    button.dataset.mode = item.id;
    const preview = buildModePreview(item.id);
    const label = document.createElement("span");
    label.className = "mode-label";
    label.textContent = item.label;
    button.append(preview, label);
    button.addEventListener("click", () => selectMode(item.id));
    button.addEventListener("mouseenter", () => replayPreview(preview));
    button.addEventListener("focus", () => replayPreview(preview));
    modeOptionsEl.appendChild(button);
  });
  requestAnimationFrame(() => updateHighlight(modeOptionsEl.querySelector(".mode-option.active")));
}
