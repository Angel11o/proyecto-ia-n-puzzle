const API_BASE_URL = "http://localhost:8080";

/** Configuración de espera para las solicitudes del backend. */
const TIMEOUTS = { default: 8000, solve: 45000 };

/** Mensajes legibles asociados a los códigos del contrato de la API. */
const ERROR_MESSAGES = {
  invalid_size: "El tamaño del tablero no es válido.",
  invalid_board: "El tablero enviado no es válido.",
  different_parity: "Este tablero no tiene solución hacia la meta actual.",
  timeout: "El backend tardó demasiado buscando la solución. Prueba con un tablero más pequeño o genera otro juego.",
  internal_error: "El backend tuvo un error interno.",
};

/** Error normalizado para fallos de red, contrato o cancelación. */
class ApiError extends Error {
  constructor(message, { code = "unknown", status = null, aborted = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.aborted = aborted;
  }
}

/** Ejecuta una petición JSON y normaliza sus respuestas y errores. */
async function apiFetch(path, options = {}) {
  const { timeoutMs = TIMEOUTS.default, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const mapFailure = (error) => {
    if (timedOut) return new ApiError(`El backend no respondió en ${Math.round(timeoutMs / 1000)} s. Si es un tablero grande, probablemente la búsqueda es demasiado pesada.`, { code: "client_timeout" });
    if (error?.name === "AbortError") return new ApiError("Petición cancelada.", { code: "aborted", aborted: true });
    return new ApiError(`No se pudo conectar con el backend en ${API_BASE_URL}. Verifica que el servidor esté corriendo (o que permita CORS).`, { code: "network" });
  };

  try {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { headers: { "Content-Type": "application/json" }, ...fetchOptions, signal: controller.signal });
    } catch (error) {
      throw mapFailure(error);
    }

    let data = null;
    let bodyIsJson = true;
    try { data = await response.json(); }
    catch (error) {
      if (timedOut || error?.name === "AbortError") throw mapFailure(error);
      bodyIsJson = false;
    }

    if (!response.ok) {
      const code = data?.error || `http_${response.status}`;
      throw new ApiError(ERROR_MESSAGES[code] || data?.message || `El backend respondió con error ${response.status} en ${path}.`, { code, status: response.status });
    }
    if (!bodyIsJson || data === null || typeof data !== "object") {
      throw new ApiError("El backend devolvió una respuesta que no es JSON válido.", { code: "invalid_response", status: response.status });
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}
