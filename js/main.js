/** Registra los eventos de interfaz y arranca la primera partida. */
sizeSelect.addEventListener("change", () => {
  const nextSize = parseInt(sizeSelect.value, 10);
  if (!Number.isInteger(nextSize)) { syncControlsToState(); return; }
  newGame(nextSize, mode);
});
newGameBtn.addEventListener("click", () => newGame());
solveBtn.addEventListener("click", () => { if (!solveBtn.disabled) { if (isSolving) { cancelSolveRequest(); render(); } else requestSolution(); } });
solvePlayPauseBtn.addEventListener("click", togglePlayback);
solveStepBackBtn.addEventListener("click", () => { pausePlayback(); stepBack(); });
solveStepForwardBtn.addEventListener("click", () => { pausePlayback(); stepForward(); });
solveSliderEl.addEventListener("input", () => { pausePlayback(); stepTo(parseInt(solveSliderEl.value, 10)); });
solveSpeedSelect.addEventListener("change", () => { speedMs = parseInt(solveSpeedSelect.value, 10); if (isPlaying) { pausePlayback(); playPlayback(); } });
solveCloseBtn.addEventListener("click", closeSolution);
themeToggleBtn.addEventListener("click", toggleTheme);
mpToggleBtn.addEventListener("click", toggleMultiplayer);
window.addEventListener("resize", () => updateHighlight(modeOptionsEl.querySelector(".mode-option.active")));
window.addEventListener("unhandledrejection", (event) => showError(`Error inesperado: ${event.reason?.message || event.reason}`));
window.addEventListener("error", (event) => showError(`Error inesperado: ${event.message}`));
window.addEventListener("keydown", (event) => {
  if (!mp.active || event.ctrlKey || event.metaKey || event.altKey) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  for (let player = 0; player < 2; player++) {
    const direction = MP_KEYS[player][key];
    if (direction) { event.preventDefault(); mpMoveByKey(player, direction); return; }
  }
});
applyTheme("dark");
buildModeSelector();
newGame();
