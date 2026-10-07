/** Estado compartido de la partida y de la reproducción de soluciones. */
let size = 3;
let mode = "ordered";
let board = [];
let goal = [];
let isLoadingGame = false;
let moveInFlight = false;
let isSolving = false;
let solveController = null;
let solveClockId = null;
let solution = null;
let animIndex = 0;
let isPlaying = false;
let playTimer = null;
let speedMs = 500;
let moveCount = 0;
let timerRunning = false;
let timerStartedAt = null;
let timerElapsedMs = 0;
let timerIntervalId = null;
let lastDisplayed = null;

/** Estado independiente de cada jugador durante una carrera local. */
const mp = { active: false, boards: [[], []], moves: [0, 0], winner: null };

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const sizeSelect = document.getElementById("size-select");
const newGameBtn = document.getElementById("new-game-btn");
const solveBtn = document.getElementById("solve-btn");
const modeOptionsEl = document.getElementById("mode-options");
const solvePanelEl = document.getElementById("solve-panel");
const solveSliderEl = document.getElementById("solve-slider");
const solveStepLabelEl = document.getElementById("solve-step-label");
const solvePlayPauseBtn = document.getElementById("solve-play-pause");
const solveStepBackBtn = document.getElementById("solve-step-back");
const solveStepForwardBtn = document.getElementById("solve-step-forward");
const solveSpeedSelect = document.getElementById("solve-speed-select");
const solveCloseBtn = document.getElementById("solve-close");
const moveCounterEl = document.getElementById("move-counter");
const timerEl = document.getElementById("timer");
const errorEl = document.getElementById("error-banner");
const themeToggleBtn = document.getElementById("theme-toggle");

const MODES = [
  { id: "ordered", label: "Básico" },
  { id: "reverse", label: "Mayor a menor" },
  { id: "spiral", label: "Espiral" },
  { id: "columns", label: "Columnas" },
  { id: "snake", label: "Serpiente" },
];
