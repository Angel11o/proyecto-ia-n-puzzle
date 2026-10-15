/** Máximo de posiciones visibles en cada tabla de puntuaciones. */
const SCOREBOARD_LIMIT = 5;

/** Colores de los trofeos del 1.er, 2.º y 3.er lugar (oro, plata y bronce). */
const TROPHY_COLORS = ["#f5c542", "#c9d1dc", "#cd7f32"];
const TROPHY_LABELS = ["Trofeo de oro", "Trofeo de plata", "Trofeo de bronce"];

/**
 * Tablas en memoria. Se conservan al cambiar de modo de juego, de tamaño o al
 * alternar entre individual y carrera; se reinician al recargar o cerrar la página.
 */
const scoreboards = {
  single: { entries: [], listEl: document.getElementById("sb-single-list") },
  mp: { entries: [], listEl: document.getElementById("sb-mp-list") },
};
let scoreSequence = 0;

const nameModalEl = document.getElementById("name-modal");
const nameFormEl = document.getElementById("name-form");
const nameTitleEl = document.getElementById("name-modal-title");
const nameTextEl = document.getElementById("name-modal-text");
const nameInputEl = document.getElementById("name-input");
const nameSkipBtn = document.getElementById("name-skip");
let nameModalResolve = null;
let nameModalFallback = "Jugador";

/** Convierte milisegundos a mm:ss.d (con décimas) para desempatar mejor. */
function formatPreciseTime(milliseconds) {
  const tenths = Math.floor(milliseconds / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
}

/** Devuelve el SVG del trofeo para las posiciones 1 a 3. */
function trophySvg(place) {
  const color = TROPHY_COLORS[place - 1];
  return `<svg class="trophy" viewBox="0 0 24 24" role="img" aria-label="${TROPHY_LABELS[place - 1]}">
    <path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="${color}"/>
    <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 14v3" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 21v-2.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V21z" fill="${color}"/>
  </svg>`;
}

/** Crea un span con clase y texto opcional. */
function scoreCell(className, text = "") {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

/** Construye la fila de una entrada ya registrada. */
function buildScoreRow(entry, place) {
  const row = document.createElement("li");
  row.className = "sb-row";
  row.dataset.id = String(entry.id);
  row.dataset.place = String(place);
  const trophy = scoreCell("sb-trophy");
  if (place <= 3) trophy.innerHTML = trophySvg(place);
  row.append(
    scoreCell("sb-pos", `${place}.`),
    trophy,
    scoreCell("sb-name", entry.name),
    scoreCell("sb-meta", `${entry.size}×${entry.size} · ${entry.moves} mov.`),
    scoreCell("sb-time", formatPreciseTime(entry.timeMs)),
  );
  return row;
}

/** Construye una fila vacía para mantener siempre la misma altura de la tabla. */
function buildEmptyRow(place) {
  const row = document.createElement("li");
  row.className = "sb-row empty";
  row.append(scoreCell("sb-pos", `${place}.`), scoreCell("sb-trophy"), scoreCell("sb-name", "—"), scoreCell("sb-meta"), scoreCell("sb-time"));
  return row;
}

/** Dibuja la tabla y anima los cambios de posición (técnica FLIP). */
function renderScoreboard(key, newId = null) {
  const { entries, listEl } = scoreboards[key];
  const oldRows = new Map();
  listEl.querySelectorAll(".sb-row[data-id]").forEach((row) => oldRows.set(row.dataset.id, { node: row, rect: row.getBoundingClientRect() }));
  const listTop = listEl.getBoundingClientRect().top;

  listEl.innerHTML = "";
  for (let index = 0; index < SCOREBOARD_LIMIT; index++) {
    listEl.appendChild(entries[index] ? buildScoreRow(entries[index], index + 1) : buildEmptyRow(index + 1));
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const bottomRect = listEl.lastElementChild.getBoundingClientRect();
  listEl.querySelectorAll(".sb-row[data-id]").forEach((row) => {
    const old = oldRows.get(row.dataset.id);
    const rect = row.getBoundingClientRect();
    if (old) {
      const dy = old.rect.top - rect.top;
      if (Math.abs(dy) > 0.5) row.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    } else if (String(newId) === row.dataset.id) {
      // La nueva marca sube desde el fondo hasta su posición, empujando a las demás.
      row.classList.add("sb-new");
      const dy = bottomRect.top - rect.top;
      row.animate([{ transform: `translateY(${dy}px) scale(0.96)`, opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }], { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
  });

  // Quien sale del top se desvanece en su lugar anterior.
  oldRows.forEach((old, id) => {
    if (listEl.querySelector(`.sb-row[data-id="${id}"]`)) return;
    const ghost = old.node.cloneNode(true);
    ghost.removeAttribute("data-id");
    ghost.classList.remove("sb-new");
    ghost.classList.add("sb-ghost");
    ghost.style.top = `${old.rect.top - listTop}px`;
    ghost.style.width = `${old.rect.width}px`;
    ghost.style.height = `${old.rect.height}px`;
    listEl.appendChild(ghost);
    const fade = ghost.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(32px)" }], { duration: 420, easing: "ease-in", fill: "forwards" });
    fade.onfinish = () => ghost.remove();
  });
}

/** Indica si un tiempo entra al top de la tabla indicada. */
function qualifiesForScoreboard(key, timeMs) {
  const { entries } = scoreboards[key];
  return entries.length < SCOREBOARD_LIMIT || timeMs < entries[entries.length - 1].timeMs;
}

/** Inserta una marca ordenada por tiempo y descarta la que quede fuera del top. */
function addScore(key, { name, timeMs, size: boardSize, moves }) {
  const entry = { id: ++scoreSequence, name, timeMs, size: boardSize, moves };
  const { entries } = scoreboards[key];
  let position = entries.findIndex((item) => item.timeMs > timeMs);
  if (position === -1) position = entries.length;
  entries.splice(position, 0, entry);
  entries.length = Math.min(entries.length, SCOREBOARD_LIMIT);
  renderScoreboard(key, entry.id);
}

/** Indica si el modal del nombre está abierto (para bloquear el teclado del juego). */
function isNameModalOpen() { return nameModalResolve !== null; }

/** Pide el nombre del jugador; devuelve null si decide omitirlo. */
function askPlayerName({ title, text, fallback }) {
  return new Promise((resolve) => {
    nameModalResolve = resolve;
    nameModalFallback = fallback;
    nameTitleEl.textContent = title;
    nameTextEl.textContent = text;
    nameInputEl.value = "";
    nameInputEl.placeholder = fallback;
    nameModalEl.hidden = false;
    requestAnimationFrame(() => nameInputEl.focus());
  });
}

/** Cierra el modal y entrega el resultado a quien lo esperaba. */
function closeNameModal(result) {
  if (!nameModalResolve) return;
  const resolve = nameModalResolve;
  nameModalResolve = null;
  nameModalEl.hidden = true;
  resolve(result);
}

nameFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  closeNameModal(nameInputEl.value.trim() || nameModalFallback);
});
nameSkipBtn.addEventListener("click", () => closeNameModal(null));
nameModalEl.addEventListener("keydown", (event) => { if (event.key === "Escape") closeNameModal(null); });

/** Registra el resultado de una partida: si entra al top 5 pregunta el nombre. */
async function submitScore(key, { timeMs, moves, boardSize, fallbackName, who }) {
  const timeLabel = formatPreciseTime(timeMs);
  if (!qualifiesForScoreboard(key, timeMs)) {
    statusEl.textContent = `${statusEl.textContent} · ${timeLabel}: fuera del top ${SCOREBOARD_LIMIT}`;
    return;
  }
  const name = await askPlayerName({
    title: "¡Entraste al top!",
    text: `${who} — ${timeLabel}. ¿Con qué nombre te anotamos?`,
    fallback: fallbackName,
  });
  if (name === null) return;
  addScore(key, { name, timeMs, size: boardSize, moves });
}