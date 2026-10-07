/** Obtiene la meta oficial del modo seleccionado. */
async function fetchGoal(modeId, n) {
  const data = await apiFetch(`/api/puzzle/goal?size=${n}&type=${modeId}`);
  return data.goal;
}

/** Solicita un tablero inicial compatible con la meta indicada. */
async function fetchNewBoard(n, goalBoard) {
  const data = await apiFetch("/api/puzzle/new", { method: "POST", body: JSON.stringify({ size: n, goal: goalBoard }) });
  return data.board;
}

/** Envía un movimiento manual al backend y actualiza la partida confirmada. */
async function tryMove(index) {
  if (mp.active || solution || moveInFlight || isSolving || isLoadingGame || !isValidBoard(board, size)) return;
  const emptyIndex = board.indexOf(0);
  if (!getAdjacentIndices(emptyIndex, size).includes(index)) return;
  const direction = directionOfEmptyMove(emptyIndex, index, size);
  const boardBefore = board;
  moveInFlight = true;
  try {
    const data = await apiFetch("/api/puzzle/move", { method: "POST", body: JSON.stringify({ size, board: boardBefore, move: direction }) });
    if (board !== boardBefore) return;
    assertBoard(data.board, size, "tablero");
    if (!isSingleMove(boardBefore, data.board, size)) throw new ApiError("El backend devolvió un movimiento que no corresponde.", { code: "invalid_response" });
    clearError();
    if (moveCount === 0) startTimer();
    moveCount++;
    board = data.board;
  } catch (error) {
    if (!error.aborted) showError(`No se pudo mover: ${error.message}`);
  } finally {
    moveInFlight = false;
    render();
  }
}

/** Crea una partida nueva y confirma su estado sólo si todas las solicitudes son válidas. */
async function newGame(nextSize = size, nextMode = mode) {
  if (isLoadingGame) return;
  isLoadingGame = true;
  cancelSolveRequest();
  setControlsBusy(true);
  clearError();
  pausePlayback();
  statusEl.textContent = "Generando tablero…";
  try {
    const newGoal = await fetchGoal(nextMode, nextSize);
    assertBoard(newGoal, nextSize, "estado meta");
    const newBoard = await fetchNewBoard(nextSize, newGoal);
    assertBoard(newBoard, nextSize, "tablero");
    size = nextSize;
    mode = nextMode;
    goal = newGoal;
    board = newBoard;
    solution = null;
    solvePanelEl.hidden = true;
    resetStats();
    if (mp.active) mpStart();
  } catch (error) {
    showError(`No se pudo generar el juego: ${error.message}`);
  } finally {
    isLoadingGame = false;
    setControlsBusy(false);
    syncControlsToState();
    render();
  }
}

/** Valida la resolubilidad y solicita la ruta calculada por el backend. */
async function requestSolution() {
  if (isSolving || isLoadingGame || solution) return;
  const n = size;
  const initial = [...board];
  const target = [...goal];
  if (!isValidBoard(initial, n) || !isValidBoard(target, n)) {
    showError("No hay un tablero válido para resolver. Genera un juego nuevo.");
    return;
  }
  clearError();
  const controller = new AbortController();
  solveController = controller;
  isSolving = true;
  startSolveClock();
  render();
  const payload = JSON.stringify({ size: n, initial, goal: target });
  try {
    const validation = await apiFetch("/api/puzzle/validate", { method: "POST", body: payload, signal: controller.signal });
    if (typeof validation.solvable !== "boolean") throw new ApiError("Respuesta de /validate con formato inesperado.", { code: "invalid_response" });
    if (!validation.solvable) { showError(ERROR_MESSAGES[validation.reason] || "Este tablero no tiene solución hacia la meta actual."); return; }
    const data = await apiFetch("/api/puzzle/solve", { method: "POST", body: payload, timeoutMs: TIMEOUTS.solve, signal: controller.signal });
    if (typeof data.solvable !== "boolean") throw new ApiError("Respuesta de /solve con formato inesperado.", { code: "invalid_response" });
    if (!data.solvable) { showError("El backend no encontró una solución para este tablero."); return; }
    validateSolution(data, initial, target, n);
    startSolutionPlayback({ moves: data.moves, states: data.states });
  } catch (error) {
    if (!error.aborted) showError(`Error al resolver: ${error.message}`);
  } finally {
    if (solveController === controller) { solveController = null; isSolving = false; stopSolveClock(); }
    render();
  }
}

/** Inicia el panel de reproducción con una solución ya validada. */
function startSolutionPlayback(result) {
  solution = result;
  animIndex = 0;
  solvePanelEl.hidden = false;
  solveSliderEl.max = String(result.states.length - 1);
  solveSliderEl.value = "0";
  render();
}

/** Muestra un estado específico dentro de la solución. */
function stepTo(index) {
  if (!solution) return;
  animIndex = Math.max(0, Math.min(solution.states.length - 1, index));
  solveSliderEl.value = String(animIndex);
  render();
  if (animIndex >= solution.states.length - 1) pausePlayback();
}

/** Avanza o retrocede un estado de la solución. */
function stepForward() { stepTo(animIndex + 1); }
function stepBack() { stepTo(animIndex - 1); }

/** Reproduce automáticamente los estados restantes. */
function playPlayback() {
  if (!solution || animIndex >= solution.states.length - 1) return;
  isPlaying = true;
  updateSolveControls();
  playTimer = setInterval(() => {
    if (!solution || animIndex >= solution.states.length - 1) { pausePlayback(); return; }
    stepTo(animIndex + 1);
  }, speedMs);
}

/** Detiene la reproducción automática sin cambiar el paso actual. */
function pausePlayback() {
  isPlaying = false;
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
  updateSolveControls();
}

/** Alterna el estado de reproducción de la solución. */
function togglePlayback() { if (isPlaying) pausePlayback(); else playPlayback(); }

/** Conserva el paso visible como partida manual y cierra el panel. */
function closeSolution() {
  if (solution) board = [...solution.states[animIndex]];
  pausePlayback();
  solution = null;
  solvePanelEl.hidden = true;
  render();
}

/** Actualiza el estado de los controles del reproductor. */
function updateSolveControls() {
  if (!solution) return;
  const lastIndex = solution.states.length - 1;
  solveStepLabelEl.textContent = `Paso ${animIndex} / ${lastIndex}`;
  solvePlayPauseBtn.textContent = isPlaying ? "⏸" : "▶";
  solveStepBackBtn.disabled = animIndex === 0;
  solveStepForwardBtn.disabled = animIndex === lastIndex;
  solvePlayPauseBtn.disabled = animIndex === lastIndex;
}
