/** Comprueba que un tablero contenga una permutación válida de 0 a n² - 1. */
function isValidBoard(boardValue, n) {
  if (!Array.isArray(boardValue) || boardValue.length !== n * n) return false;
  const seen = new Set();
  for (const value of boardValue) {
    if (!Number.isInteger(value) || value < 0 || value >= n * n || seen.has(value)) return false;
    seen.add(value);
  }
  return true;
}

/** Rechaza una respuesta del backend que no representa un tablero válido. */
function assertBoard(boardValue, n, label) {
  if (!isValidBoard(boardValue, n)) throw new ApiError(`El backend devolvió un ${label} inválido.`, { code: "invalid_response" });
}

/** Compara dos tableros celda por celda. */
function sameBoard(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/** Devuelve los índices ortogonalmente adyacentes a una casilla. */
function getAdjacentIndices(index, n) {
  const row = Math.floor(index / n);
  const col = index % n;
  const result = [];
  if (row > 0) result.push(index - n);
  if (row < n - 1) result.push(index + n);
  if (col > 0) result.push(index - 1);
  if (col < n - 1) result.push(index + 1);
  return result;
}

/** Indica si el segundo tablero resulta de un único movimiento legal. */
function isSingleMove(first, second, n) {
  const emptyFirst = first.indexOf(0);
  const emptySecond = second.indexOf(0);
  if (!getAdjacentIndices(emptyFirst, n).includes(emptySecond)) return false;
  for (let index = 0; index < first.length; index++) {
    if (index !== emptyFirst && index !== emptySecond && first[index] !== second[index]) return false;
  }
  return first[emptySecond] === second[emptyFirst];
}

/** Valida la secuencia de estados devuelta por el solucionador. */
function validateSolution(data, initial, target, n) {
  const invalid = (reason) => { throw new ApiError(`Solución inválida del backend (${reason}).`, { code: "invalid_response" }); };
  const { moves, states } = data;
  if (!Array.isArray(moves) || !Array.isArray(states)) invalid("formato incorrecto");
  if (states.length !== moves.length + 1) invalid("states y moves no coinciden");
  states.forEach((state) => { if (!isValidBoard(state, n)) invalid("estado mal formado"); });
  if (!sameBoard(states[0], initial)) invalid("no parte del tablero actual");
  if (!sameBoard(states[states.length - 1], target)) invalid("no termina en la meta");
  for (let index = 1; index < states.length; index++) if (!isSingleMove(states[index - 1], states[index], n)) invalid(`el paso ${index} no es un movimiento legal`);
}

/** Devuelve el orden fila por fila usado por el modo básico. */
function rowMajorOrder(n) { return Array.from({ length: n * n }, (_, index) => index); }

/** Devuelve el recorrido horario en espiral de una matriz cuadrada. */
function spiralOrder(n) {
  const order = [];
  let top = 0, bottom = n - 1, left = 0, right = n - 1;
  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col++) order.push(top * n + col);
    top++;
    for (let row = top; row <= bottom; row++) order.push(row * n + right);
    right--;
    if (top <= bottom) { for (let col = right; col >= left; col--) order.push(bottom * n + col); bottom--; }
    if (left <= right) { for (let row = bottom; row >= top; row--) order.push(row * n + left); left++; }
  }
  return order;
}

/** Devuelve el recorrido vertical, columna por columna. */
function columnsOrder(n) {
  const order = [];
  for (let col = 0; col < n; col++) for (let row = 0; row < n; row++) order.push(row * n + col);
  return order;
}

/** Devuelve el recorrido de filas alternando el sentido. */
function snakeOrder(n) {
  const order = [];
  for (let row = 0; row < n; row++) {
    if (row % 2 === 0) for (let col = 0; col < n; col++) order.push(row * n + col);
    else for (let col = n - 1; col >= 0; col--) order.push(row * n + col);
  }
  return order;
}

/** Selecciona el recorrido de llenado correspondiente a cada modo. */
function fillOrderForMode(modeId, n) {
  if (modeId === "spiral") return spiralOrder(n);
  if (modeId === "columns") return columnsOrder(n);
  if (modeId === "snake") return snakeOrder(n);
  return rowMajorOrder(n);
}

/** Construye la meta de vista previa para un modo y tamaño dados. */
function goalForMode(modeId, n) {
  const order = fillOrderForMode(modeId, n);
  const boardValue = new Array(n * n).fill(0);
  for (let index = 0; index < order.length - 1; index++) boardValue[order[index]] = modeId === "reverse" ? n * n - 1 - index : index + 1;
  return boardValue;
}

/** Traduce el desplazamiento del espacio vacío al vocabulario de la API. */
function directionOfEmptyMove(fromIndex, toIndex, n) {
  if (toIndex === fromIndex - n) return "UP";
  if (toIndex === fromIndex + n) return "DOWN";
  if (toIndex === fromIndex - 1) return "LEFT";
  return "RIGHT";
}
