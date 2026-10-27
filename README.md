# N-Puzzle

Aplicación web interactiva del juego N-Puzzle.

## Características

- Tableros de distintos tamaños.
- Modos de objetivo: básico, inverso, espiral, columnas y serpiente.
- Solucionador conectado a un backend local.
- Reproducción paso a paso de la solución.
- Modo multijugador local.
- Tema claro y oscuro.

## Ejecución

1. Asegúrate de que el backend esté compilado y disponible.
2. Ejecuta `iniciar.bat`.
3. El navegador abrirá la interfaz automáticamente.

## Tecnologías

- HTML
- CSS
- JavaScript
- Backend local para la lógica del N-Puzzle

## Backend

La lógica de generación y resolución del N-Puzzle está implementada en un repositorio independiente:

[Backend N-Puzzle — @EdSoria](https://github.com/EdSoria/coco-engine)

Para ejecutar el proyecto completo, primero debes compilar e iniciar ese backend localmente.

## Cómo ejecutarlo (Windows)

1. Clona el repo o descarga el ZIP y descomprímelo.
2. Descarga `puzzle_server.exe` desde la sección **Releases** del repo del backend: <https://github.com/EdSoria/coco-engine>
3. Crea una carpeta `backend` dentro del proyecto y guarda ahí el `.exe`
   (si el release trae DLLs, guárdalas junto al `.exe`).
4. Doble clic en `iniciar.bat`: arranca el backend en el puerto 8080 y abre la página.

Si ves «No se pudo conectar con el backend», revisa que la ventana del servidor siga abierta
y que nada más use el puerto 8080.