# 🏆 World Cup Simulator

Un simulador de Mundiales de Fútbol en tiempo real, determinista y continuo. Cada ciclo de 7 días representa un torneo completo — con fase de grupos, ronda eliminatoria, finales, estadísticas históricas y plantillas de jugadores que evolucionan edición a edición.

---

## ¿Qué es?

World Cup Simulator es una aplicación web que simula torneos de Fútbol sin fin, de forma **determinista**: dado un instante en el tiempo, cualquier dispositivo en el mundo calculará exactamente el mismo estado del torneo, los mismos goles, los mismos ganadores. No hay datos almacenados en servidor; toda la lógica corre en el navegador.

Cada 7 días comienza una nueva edición del Mundial. El torneo avanza en tiempo real:

- Las 48 partidas de la fase de grupos se juegan a lo largo de varios días.
- La ronda de 16, cuartos, semifinales, tercer puesto y final siguen con tiempos reales intercalados.
- Al terminar, hay un período de celebración y luego una cuenta regresiva para la siguiente edición.

---

## Características principales

- **Determinismo total** — Misma marca temporal = mismo resultado en cualquier dispositivo o navegador. No depende de aleatoriedad en tiempo de ejecución.
- **128 selecciones nacionales** con plantillas de jugadores ficticios y evolución por edición.
- **3.200 jugadores ficticios** generados proceduralmente con nombres culturalmente apropiados, fecha de nacimiento, ciudad natal y estadísticas de carrera.
- **Fichas de jugador con foto IA** — Cada jugador tiene una foto realista asignada de forma determinista según su equipo y ID.
- **Simulación minuto a minuto** — Goles, asistencias, tarjetas, tiempo extra y penales.
- **6 vistas interactivas**: En Vivo, Grupos, Llave, Equipos, Historial y Estadísticas.
- **Nombres de jugadores clicables** — Navegación directa a la ficha del jugador desde cualquier vista.
- **Estadísticas históricas acumuladas** — Goleadores, campeones, registros por edición, carrera completa por jugador.
- **Modo PWA** — Instalable como app, funciona offline.
- **Tema oscuro / claro** persistido en `localStorage`.
- **Diseño mobile-first** con navegación inferior en móvil y sidebar en escritorio.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | Vanilla JavaScript (ES6+), sin framework |
| Build tool | [Vite](https://vite.dev/) 7.x |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) v4 |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Testing | [Vitest](https://vitest.dev/) |
| Tipografía | Outfit (fuente local) |
| Generación de fotos | [Hugging Face Inference API](https://huggingface.co/docs/api-inference) + FLUX.1-schnell |
| Procesado de imágenes | [sharp](https://sharp.pixelplumbing.com/) |
| Deploy | GitHub Actions → FTP |

No se usa React, Vue, Angular ni ningún otro framework. El DOM se construye con un helper ligero `el(tag, opts)` propio.

---

## Arquitectura del proyecto

```
world-cup-simulator/
├── src/
│   ├── engine/              # Motor de simulación (lógica pura)
│   │   ├── prng.js          # PRNG determinista Mulberry32
│   │   ├── simulation.js    # API pública: getCurrentState(), stats
│   │   ├── match.js         # Simulación minuto a minuto
│   │   ├── tournament.js    # Orquestación completa del torneo
│   │   ├── group-stage.js   # Fase de grupos
│   │   ├── knockout.js      # Eliminatoria (R16 → Final)
│   │   ├── teams.js         # Definición de las 128 selecciones
│   │   ├── players.js       # Pool base de jugadores
│   │   ├── playerEvolution.js  # Generación de plantillas por edición
│   │   ├── playerPhotos.js  # Asignación determinista de fotos por jugador
│   │   ├── draw.js          # Sorteo por grupos (sistema de bombos)
│   │   ├── hosts.js         # Selección de país sede
│   │   └── timeline.js      # Calendario y tiempos del torneo
│   ├── ui/                  # Capa de presentación
│   │   ├── app.js           # Shell de la app, header, nav, menú
│   │   ├── router.js        # Router SPA basado en hash
│   │   ├── components.js    # Helpers de DOM reutilizables
│   │   └── views/           # Vistas de cada sección
│   │       ├── dashboard.js    # En Vivo — partidos actuales, cuenta regresiva
│   │       ├── groups.js       # Tabla de grupos y partidos
│   │       ├── bracket.js      # Llave eliminatoria visual
│   │       ├── teams.js        # Plantillas y estadísticas por equipo
│   │       ├── history.js      # Historial de torneos pasados
│   │       ├── stats.js        # Registros históricos y clasificaciones
│   │       └── player-detail.js # Ficha completa del jugador con foto y carrera
│   ├── styles/
│   │   ├── main.css         # Variables de tema e imports
│   │   ├── modern.css       # Tarjetas, insignias, componentes UI
│   │   ├── fonts.css        # Declaración de fuente Outfit
│   │   └── animations.css   # Transiciones y keyframes
│   ├── constants.js         # EPOCH, CYCLE_DURATION, calendario
│   └── main.js              # Inicialización y loop de tick (1 seg)
├── public/
│   ├── manifest.json        # Manifiesto PWA
│   ├── assets/              # Iconos y fuentes estáticas
│   └── players/             # Banco de fotos de jugadores generadas con IA
│       ├── manifest.json    # Índice de fotos por categoría cultural
│       ├── euro_latin/      # Jugadores del sur/oeste de Europa
│       ├── euro_north/      # Jugadores del norte de Europa
│       ├── euro_east/       # Jugadores del este de Europa
│       ├── euro_caucasus/   # Jugadores de Cáucaso y Turquía
│       ├── south_america/   # Jugadores de Sudamérica
│       ├── africa_dark/     # Jugadores de África Subsahariana
│       ├── africa_north/    # Jugadores de África del Norte
│       ├── middle_east/     # Jugadores de Oriente Medio
│       ├── east_asia/       # Jugadores de Asia Oriental
│       └── mixed_americas/  # Jugadores de Norteamérica y el Caribe
├── scripts/
│   ├── generate-player-photos.mjs  # Genera fotos con Hugging Face (gratuito)
│   └── convert-player-photos.mjs  # Convierte JPG existentes a WebP 100×100
├── tests/                   # Suite de tests con Vitest
│   ├── determinism.test.js
│   ├── prng.test.js
│   ├── match.test.js
│   ├── tournament.test.js
│   └── timeline.test.js
├── .github/workflows/
│   └── deploy.yml           # CI/CD → build y deploy por FTP
├── vite.config.js
└── package.json
```

### Separación de responsabilidades

- **`/engine`** — Lógica pura. No toca el DOM. Computable en Node.js o en tests.
- **`/ui`** — Renderizado. Las vistas son funciones que reciben el estado y pintan el DOM.
- El tick loop llama `getCurrentState()` cada segundo y pasa el snapshot a la vista activa.

---

## Fichas de jugador y fotos IA

Cada uno de los 3.200 jugadores ficticios tiene una ficha de perfil accesible haciendo clic en su nombre desde cualquier vista (equipos, estadísticas, historial). La ficha incluye:

- **Foto** generada con IA (100×100 px, WebP), asignada de forma determinista
- Nombre, posición, fecha de nacimiento, edad y ciudad natal
- Bandera y nombre del equipo
- Historial completo de Mundiales: partidos, minutos, goles, rating, Bota de Oro y MVP

### Cómo funciona la asignación de fotos

Las fotos se organizan en **10 categorías culturales** que se corresponden con la apariencia típica de cada selección nacional. Cuando se abre la ficha de un jugador:

1. Se determina la categoría de su equipo (p. ej. España → `euro_latin`, Brasil → `south_america`).
2. Se aplica un hash determinista sobre `playerId + teamCode` para elegir una foto concreta del banco.
3. El mismo jugador siempre recibe la misma foto en cualquier sesión o dispositivo.
4. Si la categoría aún no tiene fotos generadas, se muestra un avatar con las iniciales del jugador como fallback.

---

## Generación de fotos con IA

El banco de fotos se genera offline con el modelo **FLUX.1-schnell** a través de la API gratuita de Hugging Face. Las fotos son retratos fotorrealistas de 100×100 px en WebP.

### Requisitos

1. Crear una cuenta gratuita en [huggingface.co](https://huggingface.co) (sin tarjeta de crédito).
2. Generar un token en [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (tipo *Read* es suficiente).
3. Tener Node.js 18+ y `sharp` instalado (`npm install`).

### Generar fotos nuevas

```bash
# Con la variable directamente en el comando
HF_TOKEN=tu_token node scripts/generate-player-photos.mjs

# O usando un archivo .env (recomendado, ya está en .gitignore)
echo "HF_TOKEN=tu_token" > .env
node --env-file=.env scripts/generate-player-photos.mjs
```

El script genera hasta **385 imágenes** distribuidas en 10 categorías. Es **reanudable**: si se interrumpe, salta automáticamente las imágenes ya generadas. La API gratuita de Hugging Face tiene un límite mensual de créditos; cuando se agota, basta con esperar al mes siguiente o usar otro token.

### Convertir fotos existentes a WebP 100×100

Si ya tienes imágenes `.jpg` generadas por versiones anteriores del script, conviértelas con:

```bash
node scripts/convert-player-photos.mjs
```

Redimensiona todas las `.jpg` a 100×100 px, las convierte a WebP y regenera el `manifest.json`.

### Añadir fotos generadas al repositorio

Después de generar o convertir fotos, commitea los cambios:

```bash
git add public/players/
git commit -m "feat(players): add generated photos for <categoría>"
git push origin main
```

### Categorías y selecciones

| Categoría | Selecciones |
|---|---|
| `euro_latin` | España, Francia, Italia, Portugal, Bélgica, Países Bajos… |
| `euro_north` | Inglaterra, Escocia, Alemania, Suecia, Noruega, Dinamarca… |
| `euro_east` | Polonia, Croacia, Serbia, Ucrania, República Checa… |
| `euro_caucasus` | Turquía, Georgia, Armenia, Azerbaiyán… |
| `south_america` | Brasil, Argentina, Colombia, Uruguay, Chile… |
| `africa_dark` | Nigeria, Ghana, Senegal, Costa de Marfil, Camerún… |
| `africa_north` | Marruecos, Argelia, Túnez, Egipto… |
| `middle_east` | Arabia Saudí, Irán, Qatar, Emiratos Árabes… |
| `east_asia` | Japón, Corea del Sur, China, Vietnam, Indonesia… |
| `mixed_americas` | Estados Unidos, México, Jamaica, Costa Rica… |

---

## Cómo funciona el determinismo

### PRNG Mulberry32

En lugar de `Math.random()`, se usa el algoritmo **Mulberry32** con semilla explícita. La semilla se deriva de la edición del torneo y el contexto del partido:

```js
const seed = combineSeed('match', edition, matchId);
const rng = mulberry32(seed);
```

Misma semilla → misma secuencia de números → mismo resultado siempre.

### Base temporal (EPOCH)

El simulador ancla toda la cronología a un timestamp fijo llamado `EPOCH`:

```
EPOCH = 1771358400000  // 2026-06-17 20:00:00 UTC (primer torneo)
CYCLE_DURATION = 10.080 minutos (7 días exactos)

Edición actual  = floor((ahora - EPOCH) / CYCLE_DURATION_ms)
Minuto del ciclo = (ahora - EPOCH) % CYCLE_DURATION_ms / 60000
```

Cada "minuto del ciclo" corresponde a una fase del torneo según un calendario fijo definido en `constants.js`.

### Calendario del torneo

| Minutos del ciclo | Fase |
|---|---|
| 0 – 60 | Sorteo de grupos |
| 60 – 5.820 | Fase de grupos (48 partidos) |
| 5.820 – 5.940 | Descanso |
| 5.940 – 6.660 | Ronda de 16 |
| 6.660 – 6.780 | Descanso |
| 6.780 – 7.380 | Cuartos de final |
| 7.380 – 7.500 | Descanso |
| 7.500 – 8.100 | Semifinales |
| 8.100 – 8.220 | Descanso |
| 8.220 – 8.520 | Tercer puesto |
| 8.520 – 8.640 | Descanso |
| 8.640 – 8.940 | Final |
| 8.940 – 9.000 | Celebración |
| 9.000 – 10.080 | Cuenta regresiva a la siguiente edición |

---

## Simulación de partidos

La función `simulateMatch()` itera minuto a minuto (1–90, +30 en tiempo extra si aplica):

- **Probabilidad de gol por minuto**: `BASE (2.7%) × (maxRating / minRating)⁴ + boost por fatiga`
- **Selección del goleador**: ponderada por `peso de posición × rating²`
- **Penales**: 5 series, tasa de conversión del 75%, deterministas por semilla

---

## Instalación y desarrollo local

### Requisitos

- Node.js 18+
- npm

### Pasos

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd world-cup-simulator

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

En desarrollo, el `EPOCH` se calcula automáticamente para situar la simulación en la **tercera edición** del torneo, de modo que ya hay historial disponible al abrir la app.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `/dist` |
| `npm run preview` | Previsualizar el build de producción |
| `npm run test` | Ejecutar todos los tests |
| `npm run test:watch` | Tests en modo watch |

---

## Variables de entorno

El proyecto usa una única variable de entorno en tiempo de build:

| Variable | Descripción |
|---|---|
| `VITE_EPOCH` | Timestamp Unix (ms) que ancla el inicio del primer torneo. Si no se define, se calcula automáticamente en desarrollo. |

En producción este valor está **hardcodeado en el workflow de CI** (`deploy.yml`) para garantizar que el servidor y los clientes usen siempre el mismo punto de anclaje. Para reiniciar la producción intencionalmente, basta con cambiar ese valor manualmente en el workflow.

---

## Deploy

El despliegue ocurre automáticamente al hacer push a `main` mediante GitHub Actions:

1. Se inyecta `VITE_EPOCH` como variable de entorno.
2. Se ejecuta `npm run build`.
3. El contenido de `/dist` se sube por FTP al servidor de producción.

Las credenciales se configuran como secrets en el repositorio de GitHub:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`

---

## Tests

La suite de tests cubre las capas críticas del motor de simulación:

```bash
npm run test
```

| Archivo | Qué verifica |
|---|---|
| `determinism.test.js` | Mismo timestamp → estado idéntico en múltiples ejecuciones |
| `prng.test.js` | Aleatoriedad seeded, shuffle, selección ponderada |
| `match.test.js` | Conteo de goles, eventos, determinismo por partido |
| `tournament.test.js` | Caché por edición, consistencia multi-edición |
| `timeline.test.js` | Mapeo de minutos a fases del calendario |

---

## PWA

La app es instalable como PWA (Progressive Web App):

- Funciona **offline** — la simulación no requiere servidor porque es pura lógica matemática.
- Iconos adaptativos (192×192 y 512×512, con versión maskable).
- Modo standalone (sin barra del navegador al instalar).
- Service worker con caché de assets estáticos (JS, CSS, HTML, fuentes, imágenes WebP, JSON).
