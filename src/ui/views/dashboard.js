import { el, flag, formatMinutes, formatCountdown, countdownDisplay, formatTime, getEditionYear } from '../components.js';
import { SCHEDULE } from '../../constants.js';
import { TEAMS } from '../../engine/teams.js';
import { getMatchDisplayState } from '../../engine/timeline.js';

/**
 * Dashboard / "En Vivo" view.
 */
export function renderDashboard(container, state) {
  const { phase } = state;

  // Optimized draw phase: skip full re-render when only countdown needs updating
  if (phase.phase === 'DRAW') {
    const drawSequence = state.tournament.draw.drawSequence;
    const totalTeams = drawSequence.length;
    const drawDurationMs = (SCHEDULE.DRAW.end - SCHEDULE.DRAW.start) * 60 * 1000;
    const revealIntervalMs = drawDurationMs / totalTeams;
    const phaseElapsedMs = (state.timestamp - state.cycleStart) - (SCHEDULE.DRAW.start * 60 * 1000);
    const revealedCount = Math.min(totalTeams, Math.max(0, Math.floor(phaseElapsedMs / revealIntervalMs)));

    if (revealedCount === lastDrawRenderedCount && container.childNodes.length > 0) {
      updateDrawCountdownInPlace(state, revealedCount, totalTeams);
      return;
    }

    // New team revealed — trigger ball animation
    if (revealedCount > lastDrawRenderedCount && lastDrawRenderedCount >= 0 && revealedCount <= totalTeams) {
      const newlyRevealed = drawSequence[revealedCount - 1];
      if (newlyRevealed) {
        ballTeam = newlyRevealed.team;
        ballGroup = newlyRevealed.group;
        showingBall = true;
        if (drawBallTimeoutId) clearTimeout(drawBallTimeoutId);
        drawBallTimeoutId = setTimeout(() => {
          showingBall = false;
          drawBallTimeoutId = null;
          lastDrawRenderedCount = -1; // Force re-render on next tick
        }, 1800);
      }
    }

    lastDrawRenderedCount = revealedCount;
  } else {
    lastDrawRenderedCount = -1;
    if (drawBallTimeoutId) {
      clearTimeout(drawBallTimeoutId);
      drawBallTimeoutId = null;
      showingBall = false;
    }
  }

  container.innerHTML = '';
  container.appendChild(createHero(state));

  switch (phase.phase) {
    case 'DRAW':
      container.appendChild(renderDrawPhase(state));
      break;
    case 'CELEBRATION':
      container.appendChild(renderCelebration(state));
      break;
    case 'COUNTDOWN':
      container.appendChild(renderCountdown(state));
      break;
    default:
      if (phase.phase.startsWith('REST')) {
        container.appendChild(renderRestPhase(state));
      } else {
        container.appendChild(renderLivePhase(state));
      }
  }
}

/* ── Hero ── */

function createHero(state) {
  const { phase, tournament, edition } = state;
  const progress = Math.min(100, Math.round(phase.phaseProgress * 100));

  return el('div', {
    className: 'card p-5 md:p-6 mb-6',
    children: [
      el('div', {
        className: 'flex items-start justify-between mb-4',
        children: [
          el('div', {
            className: 'flex items-center gap-3',
            children: [
              (() => {
                const f = flag(tournament.host.code, 80);
                f.style.height = '30px';
                f.style.width = '44px';
                f.style.objectFit = 'cover';
                return f;
              })(),
              el('div', {
                className: 'space-y-0.5',
                children: [
                  el('h2', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-base font-bold leading-none' }),
                  el('span', { text: tournament.host.name, className: 'text-sm text-text-secondary leading-none block' }),
                ],
              }),
            ],
          }),
          el('div', {
            className: `pill ${getPhaseStyle(phase.phase)}`,
            children: [
              isActivePhase(phase.phase) ? el('span', { className: 'live-dot' }) : null,
              el('span', { text: phase.label }),
            ].filter(Boolean),
          }),
        ],
      }),
      el('div', {
        className: 'flex items-center gap-3',
        children: [
          el('div', {
            className: 'flex-1 progress-track h-1.5',
            children: [
              el('div', { className: 'progress-fill h-full', style: { width: `${progress}%` } }),
            ],
          }),
          el('span', { text: `${progress}%`, className: 'text-xs text-text-muted font-medium tabular-nums' }),
        ],
      }),
    ],
  });
}

function isActivePhase(phase) {
  return ['GROUP_STAGE', 'ROUND_16', 'QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE'].includes(phase);
}

function getPhaseStyle(phase) {
  if (phase === 'CELEBRATION') return '!bg-gold-light !text-gold';
  if (isActivePhase(phase)) return '!bg-accent-light !text-accent';
  return '';
}

/* ── Draw phase ── */

let showingBall = false;
let ballTeam = null;
let ballGroup = -1;
let lastDrawRenderedCount = -1;
let drawBallTimeoutId = null;
let drawTeamsExpanded = false;

function renderDrawPhase(state) {
  const { tournament, phase, cycleStart, timestamp } = state;
  const drawSequence = tournament.draw.drawSequence;
  const totalTeams = drawSequence.length;
  const drawDurationMs = (SCHEDULE.DRAW.end - SCHEDULE.DRAW.start) * 60 * 1000;
  const revealIntervalMs = drawDurationMs / totalTeams;
  const phaseElapsedMs = (timestamp - cycleStart) - (SCHEDULE.DRAW.start * 60 * 1000);
  const revealedCount = Math.min(totalTeams, Math.max(0, Math.floor(phaseElapsedMs / revealIntervalMs)));
  const nextRevealMs = (revealedCount + 1) * revealIntervalMs - phaseElapsedMs;

  const children = [
    el('div', {
      className: 'flex items-center justify-between mb-4',
      children: [
        el('h3', { text: 'Sorteo en curso', className: 'text-base font-bold' }),
        el('span', { text: `${revealedCount}/${totalTeams} equipos`, className: 'text-sm text-text-muted' }),
      ],
    }),
  ];

  // Ball reveal animation
  if (showingBall && ballTeam) {
    children.push(
      el('div', {
        className: 'flex justify-center mb-4',
        children: [
          el('div', {
            className: 'draw-ball',
            children: [
              flag(ballTeam.code, 32),
              el('span', { text: ballTeam.name, className: 'text-sm font-bold mt-1' }),
              ballGroup >= 0 ? el('span', {
                text: `Grupo ${String.fromCharCode(65 + ballGroup)}`,
                className: 'text-[10px] text-text-muted',
              }) : null,
            ].filter(Boolean),
          }),
        ],
      })
    );
  }

  if (revealedCount < totalTeams && !showingBall) {
    const msLeft = Math.max(0, nextRevealMs);
    children.push(
      el('div', {
        className: 'card p-5 mb-5 text-center',
        children: [
          el('p', { text: 'Siguiente equipo en', className: 'text-xs text-text-muted mb-3' }),
          el('div', { id: 'draw-countdown-value', children: [countdownDisplay(msLeft, { size: 'sm' })] }),
        ],
      })
    );
  }

  // Team list — all teams sorted alphabetically
  const revealedCodes = new Set(
    drawSequence.slice(0, revealedCount).map(d => d.team.code)
  );
  const allTeamsSorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
  const teamListContent = el('div', {
    className: 'flex flex-wrap gap-2',
    style: { display: drawTeamsExpanded ? 'flex' : 'none' },
    children: allTeamsSorted.map(team => {
      const revealed = revealedCodes.has(team.code);
      return el('div', {
        className: `flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
          revealed ? 'bg-accent-light text-accent font-medium' : 'bg-bg-surface text-text-muted'
        }`,
        children: [
          flag(team.code, 16),
          el('span', { text: team.name }),
        ],
      });
    }),
  });

  const chevronUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="18,15 12,9 6,15"/></svg>';
  const chevronDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="6,9 12,15 18,9"/></svg>';

  const chevronEl = el('span', { html: drawTeamsExpanded ? chevronUp : chevronDown, className: 'text-text-muted' });
  const contentWrapper = el('div', { className: drawTeamsExpanded ? 'mt-3' : '', children: [teamListContent] });

  children.push(
    el('div', {
      className: 'card p-4 mb-4',
      children: [
        el('button', {
          className: 'flex items-center justify-between w-full cursor-pointer',
          events: {
            click: () => {
              drawTeamsExpanded = !drawTeamsExpanded;
              teamListContent.style.display = drawTeamsExpanded ? 'flex' : 'none';
              chevronEl.innerHTML = drawTeamsExpanded ? chevronUp : chevronDown;
              contentWrapper.className = drawTeamsExpanded ? 'mt-3' : '';
            },
          },
          children: [
            el('span', {
              className: 'text-xs font-bold text-text-muted uppercase tracking-wider',
              text: `Selecciones (${revealedCodes.size}/${allTeamsSorted.length})`,
            }),
            chevronEl,
          ],
        }),
        contentWrapper,
      ],
    })
  );

  // Groups grid
  children.push(
    el('div', {
      className: 'grid grid-cols-2 md:grid-cols-4 gap-3',
      children: Array.from({ length: 8 }, (_, g) => {
        const letter = String.fromCharCode(65 + g);
        const groupTeams = drawSequence.filter(d => d.group === g);
        return el('div', {
          className: 'card p-4',
          children: [
            el('div', {
              className: 'text-xs font-bold text-text-muted mb-3 uppercase tracking-wider',
              text: `Grupo ${letter}`,
            }),
            el('div', {
              className: 'space-y-2',
              children: groupTeams.map(d => {
                const idx = drawSequence.indexOf(d);
                const show = idx < revealedCount;
                const isNew = idx === revealedCount - 1;
                return show
                  ? el('div', {
                      className: `flex items-center gap-2 py-1 ${isNew ? 'animate-slide-up' : ''}`,
                      children: [
                        flag(d.team.code, 20),
                        el('span', { text: d.team.name, className: 'text-sm' }),
                      ],
                    })
                  : el('div', { className: 'h-7 rounded-lg bg-bg-surface animate-pulse' });
              }),
            }),
          ],
        });
      }),
    })
  );

  return el('div', { children });
}

function updateDrawCountdownInPlace(state, revealedCount, totalTeams) {
  const countdownEl = document.getElementById('draw-countdown-value');
  if (!countdownEl) return;

  const drawDurationMs = (SCHEDULE.DRAW.end - SCHEDULE.DRAW.start) * 60 * 1000;
  const revealIntervalMs = drawDurationMs / totalTeams;
  const phaseElapsedMs = (state.timestamp - state.cycleStart) - (SCHEDULE.DRAW.start * 60 * 1000);
  const nextRevealMs = (revealedCount + 1) * revealIntervalMs - phaseElapsedMs;
  const msLeft = Math.max(0, nextRevealMs);

  countdownEl.innerHTML = '';
  countdownEl.appendChild(countdownDisplay(msLeft, { size: 'sm' }));
}

/* ── Live phase ── */

function renderLivePhase(state) {
  const { liveMatches, upcoming } = state;
  const children = [];

  if (liveMatches.length > 0) {
    startLiveTimelineRAF(liveMatches, state.cycleStart);
    children.push(
      el('div', {
        className: 'mb-6',
        children: [
          el('div', {
            className: 'flex items-center gap-2 mb-3',
            children: [
              el('span', { className: 'live-dot' }),
              el('span', { text: 'En vivo', className: 'text-sm font-semibold text-live' }),
              el('span', {
                text: `${liveMatches.length} partido${liveMatches.length > 1 ? 's' : ''}`,
                className: 'text-xs text-text-muted',
              }),
            ],
          }),
          el('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
            children: liveMatches.map(m => createLiveMatchCard(m)),
          }),
        ],
      })
    );
  } else {
    stopLiveTimelineRAF();
    children.push(createNextMatchCountdown(state));
  }

  if (upcoming.length > 0) {
    children.push(
      el('div', {
        children: [
          el('p', { text: 'Pr\u00f3ximos', className: 'section-title' }),
          el('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 gap-2',
            children: upcoming.map(m => createUpcomingCard(m, state)),
          }),
        ],
      })
    );
  }

  if (state.recentMatches && state.recentMatches.length > 0) {
    children.push(createRecentMatchesSection(state.recentMatches));
  }

  return el('div', { children });
}

let carouselIndex = 0;

// Live match UX state — persists across renders to detect score changes
const prevScores = new Map();    // matchId → { goalsA, goalsB }
const goalFlashUntil = new Map(); // matchId → timestamp ms

// Timeline RAF — updates cursor + fill at 60fps independently of full re-renders
let liveTimelineRAF = null;
let liveTimelineData = []; // [{ matchId, startMs, durationMs }]

function updateLiveTimelines() {
  const now = Date.now();
  for (const d of liveTimelineData) {
    const elapsedMin = Math.max(0, (now - d.startMs) / 60000);
    const { minute } = getMatchDisplayState(elapsedMin);
    const pct = `${(minute / 90 * 100).toFixed(3)}%`;
    const fill = document.getElementById(`live-fill-${d.matchId}`);
    const cursor = document.getElementById(`live-cursor-${d.matchId}`);
    if (fill) fill.style.width = pct;
    if (cursor) cursor.style.left = pct;
  }
  liveTimelineRAF = requestAnimationFrame(updateLiveTimelines);
}

function startLiveTimelineRAF(liveMatches, cycleStart) {
  liveTimelineData = liveMatches.map(m => ({
    matchId: m.matchId,
    startMs: cycleStart + m.timing.startMin * 60 * 1000,
  }));
  if (!liveTimelineRAF) {
    liveTimelineRAF = requestAnimationFrame(updateLiveTimelines);
  }
}

function stopLiveTimelineRAF() {
  if (liveTimelineRAF) {
    cancelAnimationFrame(liveTimelineRAF);
    liveTimelineRAF = null;
  }
  liveTimelineData = [];
}

function createNextMatchCountdown(state) {
  const { upcoming } = state;

  if (upcoming.length === 0) {
    return el('div', {
      className: 'card p-10 text-center',
      children: [
        el('p', { text: 'Sin partidos en vivo', className: 'text-text-secondary' }),
        el('p', { text: state.phase.label, className: 'text-sm text-text-muted mt-1' }),
      ],
    });
  }

  const next = upcoming[0];
  const sameTimeMatches = upcoming.filter(m => m.startMin === next.startMin);
  const hasCarousel = sameTimeMatches.length > 1;
  if (carouselIndex >= sameTimeMatches.length) carouselIndex = 0;

  const current = sameTimeMatches[carouselIndex];
  const nextMatchStartMs = state.cycleStart + current.startMin * 60 * 1000;
  const msUntil = nextMatchStartMs - state.timestamp;

  const roundLabel = current.type === 'group'
    ? `Grupo ${String.fromCharCode(65 + current.group)}`
    : current.round ? getRoundLabel(current.round) : null;

  // --- Team columns: flag large + name stacked ---
  function teamColumn(team, align) {
    const isRight = align === 'right';
    if (!team) {
      return el('div', {
        className: `flex-1 flex flex-col items-center gap-2 min-w-0`,
        children: [
          el('div', { className: 'w-10 h-7 rounded bg-bg-surface' }),
          el('span', { text: 'TBD', className: 'text-xs text-text-muted' }),
        ],
      });
    }
    return el('div', {
      className: `flex-1 flex flex-col items-center gap-1.5 min-w-0`,
      children: [
        flag(team.code, 40),
        el('span', {
          text: team.name,
          className: 'text-sm font-semibold truncate max-w-full text-center',
        }),
      ],
    });
  }

  // --- Matchup: teamA | VS | teamB ---
  const matchup = el('div', {
    className: 'flex items-center gap-3 px-2',
    children: [
      teamColumn(current.teamA, 'left'),
      el('div', {
        className: 'flex flex-col items-center gap-1 shrink-0',
        children: [
          el('span', {
            text: 'VS',
            className: 'text-[11px] font-bold text-text-muted tracking-wider',
          }),
        ],
      }),
      teamColumn(current.teamB, 'right'),
    ],
  });

  // --- Carousel dots ---
  const dots = hasCarousel ? el('div', {
    className: 'flex items-center justify-center gap-1.5 mt-4',
    children: sameTimeMatches.map((_, i) =>
      el('span', {
        className: `rounded-full transition-all ${i === carouselIndex
          ? 'w-4 h-1.5 bg-accent'
          : 'w-1.5 h-1.5 bg-text-muted/30'}`,
      })
    ),
  }) : null;

  // --- Card assembly ---
  const content = el('div', {
    children: [
      // Top: round label
      roundLabel ? el('div', {
        className: 'flex justify-center mb-4',
        children: [
          el('span', { text: roundLabel, className: 'badge badge-upcoming' }),
        ],
      }) : null,
      // Matchup hero
      matchup,
      // Divider
      el('div', { className: 'divider my-4 mx-10' }),
      // Countdown
      el('div', {
        className: 'text-center',
        children: [
          el('p', {
            text: hasCarousel ? 'Comienzan en' : 'Comienza en',
            className: 'text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-0.5',
          }),
          el('div', { className: 'flex justify-center', children: [countdownDisplay(msUntil)] }),
        ],
      }),
      // Carousel dots
      dots,
    ].filter(Boolean),
  });

  // Wrap with carousel arrows if needed
  if (hasCarousel) {
    return el('div', {
      className: 'card p-5 md:p-6 mb-6 relative',
      children: [
        el('button', {
          className: 'absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-bg-surface/80 text-text-muted hover:text-text-primary transition-colors z-10',
          html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="15,18 9,12 15,6"/></svg>',
          events: { click: () => { carouselIndex = (carouselIndex - 1 + sameTimeMatches.length) % sameTimeMatches.length; } },
        }),
        content,
        el('button', {
          className: 'absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-bg-surface/80 text-text-muted hover:text-text-primary transition-colors z-10',
          html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="9,18 15,12 9,6"/></svg>',
          events: { click: () => { carouselIndex = (carouselIndex + 1) % sameTimeMatches.length; } },
        }),
      ],
    });
  }

  return el('div', {
    className: 'card p-5 md:p-6 mb-6',
    children: [content],
  });
}

function getRoundLabel(round) {
  const labels = { R16: 'Octavos de Final', QF: 'Cuartos de Final', SF: 'Semifinal', THIRD: 'Tercer Puesto', FINAL: 'Final' };
  return labels[round] || round;
}

function createLiveMatchCard(match) {
  const matchId = match.matchId;
  const minute = match.matchMinute || match.currentMinute || 0;
  const matchPhase = match.matchPhase || 'playing';
  const events = match.events || [];
  const goalsA = match.goalsA ?? 0;
  const goalsB = match.goalsB ?? 0;
  const maxMinute = match.extraTime ? 120 : 90;

  // Detect score change → trigger flash (only during playing, not at halftime/end)
  const prev = prevScores.get(matchId);
  if (prev && matchPhase === 'playing' && (goalsA !== prev.goalsA || goalsB !== prev.goalsB)) {
    goalFlashUntil.set(matchId, Date.now() + 2500);
  }
  prevScores.set(matchId, { goalsA, goalsB });
  const isFlashing = (goalFlashUntil.get(matchId) || 0) > Date.now();

  const roundLabel = match.type === 'group'
    ? `Grupo ${String.fromCharCode(65 + match.group)}`
    : getRoundLabel(match.round) || '';

  const minuteDisplay = matchPhase === 'halftime'
    ? el('span', { text: 'Descanso', className: 'text-xs text-text-secondary font-bold' })
    : matchPhase === 'finalizado'
    ? el('span', { text: 'Finalizado', className: 'text-xs text-text-secondary font-bold' })
    : el('span', { text: `${minute}'`, className: 'text-xs text-live font-bold tabular-nums' });

  return el('div', {
    className: `card p-4${isFlashing ? ' animate-goal-flash' : ''}`,
    children: [
      // Header: round label + live minute/status
      el('div', {
        className: 'flex justify-between items-center mb-3',
        children: [
          el('span', { text: roundLabel, className: 'text-[11px] text-text-muted font-medium uppercase tracking-wider' }),
          el('div', {
            className: 'flex items-center gap-1.5',
            children: [
              matchPhase === 'playing' ? el('span', { className: 'live-dot' }) : null,
              minuteDisplay,
            ].filter(Boolean),
          }),
        ],
      }),

      // Score row
      el('div', {
        className: 'flex items-center gap-3 mb-3',
        children: [
          el('div', {
            className: 'flex-1 min-w-0',
            children: [el('div', {
              className: 'flex items-center gap-2',
              children: [flag(match.teamA?.code, 24), el('span', { text: match.teamA?.name || '?', className: 'text-sm font-medium truncate' })],
            })],
          }),
          el('div', {
            className: 'flex items-center gap-1.5 shrink-0',
            children: [
              el('span', { text: String(goalsA), className: `score-num ${goalsA > goalsB ? 'score-num-winner' : ''}` }),
              el('span', { text: ':', className: 'text-text-muted text-xs font-bold' }),
              el('span', { text: String(goalsB), className: `score-num ${goalsB > goalsA ? 'score-num-winner' : ''}` }),
            ],
          }),
          el('div', {
            className: 'flex-1 min-w-0 text-right',
            children: [el('div', {
              className: 'flex items-center gap-2 justify-end',
              children: [el('span', { text: match.teamB?.name || '?', className: 'text-sm font-medium truncate' }), flag(match.teamB?.code, 24)],
            })],
          }),
        ],
      }),

      // Feature 1: Goal feed
      events.length > 0 ? createGoalFeed(events, match) : null,

      // Feature 2: Match timeline
      createMatchTimeline(events, minute, maxMinute, matchId),

      // Feature 7: Dominio bar
      createDominioBar(match, goalsA, goalsB),

      // Feature 4: Dynamic narrative
      el('p', {
        text: getMatchNarrative(match, minute, goalsA, goalsB, events),
        className: 'text-[11px] text-text-muted italic text-center mt-2',
      }),
    ].filter(Boolean),
  });
}

/** Feature 1: Chronological goal feed */
function createGoalFeed(events, match) {
  return el('div', {
    className: 'flex flex-wrap gap-x-3 gap-y-1 justify-center mb-3',
    children: events.map(e => {
      const isA = e.team === 'A';
      const team = isA ? match.teamA : match.teamB;
      const f = flag(team?.code, 14);
      return el('span', {
        className: `inline-flex items-center gap-1 text-[11px] font-medium ${isA ? 'text-accent' : 'text-live'}`,
        children: [
          el('span', { text: `⚽ ${e.minute}'` }),
          f,
        ],
      });
    }),
  });
}

/** Feature 2: Timeline bar with goal markers and live cursor */
function createMatchTimeline(events, currentMinute, maxMinute, matchId) {
  const pct = min => `${Math.min(100, (min / maxMinute) * 100).toFixed(1)}%`;

  return el('div', {
    className: 'mb-3',
    children: [
      el('div', {
        className: 'relative h-4',
        children: [
          // Track
          el('div', { className: 'absolute inset-x-0 top-[7px] h-[2px] bg-bg-surface rounded-full' }),
          // Elapsed fill — id allows RAF to update smoothly at 60fps
          el('div', {
            id: matchId ? `live-fill-${matchId}` : undefined,
            className: 'absolute left-0 top-[7px] h-[2px] bg-text-muted/20 rounded-full',
            style: { width: pct(currentMinute) },
          }),
          // Goal markers (fixed positions, no animation needed)
          ...events.map(e =>
            el('div', {
              className: `absolute w-2 h-2 top-1/2 -translate-y-1/2 -translate-x-1 rounded-full ${e.team === 'A' ? 'bg-accent' : 'bg-live'}`,
              style: { left: pct(e.minute) },
            })
          ),
          // Live cursor — id allows RAF to update smoothly at 60fps
          el('div', {
            id: matchId ? `live-cursor-${matchId}` : undefined,
            className: 'absolute w-0.5 h-4 top-0 -translate-x-px bg-text-secondary/50 rounded-full',
            style: { left: pct(currentMinute) },
          }),
        ],
      }),
      el('div', {
        className: 'flex justify-between text-[9px] text-text-muted mt-0.5',
        children: [
          el('span', { text: "0'" }),
          maxMinute > 90 ? el('span', { text: 'Prórroga', className: 'text-gold' }) : null,
          el('span', { text: `${maxMinute}'` }),
        ].filter(Boolean),
      }),
    ],
  });
}

/** Feature 7: Possession-style dominio bar based on ratings + goals */
function createDominioBar(match, goalsA, goalsB) {
  const rA = match.teamA?.rating ?? 75;
  const rB = match.teamB?.rating ?? 75;
  const baseA = rA * rA;
  const baseB = rB * rB;
  const baseRatio = baseA / (baseA + baseB);
  const goalShift = (goalsA - goalsB) * 0.08;
  const domRatio = Math.max(0.15, Math.min(0.85, baseRatio + goalShift));
  const pctA = Math.round(domRatio * 100);
  const pctB = 100 - pctA;
  return el('div', {
    className: 'flex items-center gap-1.5 mb-1',
    children: [
      el('span', { text: `${pctA}%`, className: 'text-[10px] text-accent font-semibold tabular-nums shrink-0' }),
      el('div', {
        className: 'flex-1 h-[3px] rounded-full overflow-hidden flex bg-bg-surface',
        children: [
          el('div', { className: 'h-full bg-accent/70', style: { width: `${pctA}%` } }),
          el('div', { className: 'h-full bg-live/70 flex-1' }),
        ],
      }),
      el('span', { text: `${pctB}%`, className: 'text-[10px] text-live font-semibold tabular-nums shrink-0' }),
    ],
  });
}

/** Feature 4: Dynamic narrative text */
function getMatchNarrative(match, minute, goalsA, goalsB, events) {
  const diff = goalsA - goalsB;
  const absDiff = Math.abs(diff);
  const teamAhead = diff > 0 ? match.teamA : diff < 0 ? match.teamB : null;
  const teamBehind = diff > 0 ? match.teamB : diff < 0 ? match.teamA : null;
  const lastGoal = events.length > 0 ? events[events.length - 1] : null;
  const recentGoal = lastGoal && (minute - lastGoal.minute) <= 4;
  const isFinalStretch = minute >= 83;
  const isLate = minute >= 75;

  if (match.matchPhase === 'halftime') {
    if (goalsA === goalsB) return `Descanso: empatados a ${goalsA}`;
    return `Descanso: ${teamAhead?.name} gana la primera parte`;
  }

  if (match.matchPhase === 'finalizado') {
    if (goalsA === goalsB) return `Empate a ${goalsA} — partido finalizado`;
    return `${teamAhead?.name} gana ${Math.max(goalsA, goalsB)}-${Math.min(goalsA, goalsB)}`;
  }

  if (minute <= 3) return 'Partido recién comenzado';

  if (recentGoal) {
    const scorer = lastGoal.team === 'A' ? match.teamA : match.teamB;
    if (goalsA === goalsB) return `¡${scorer?.name} empata el partido!`;
    if (absDiff >= 2) return `¡Golazo de ${scorer?.name}! Diferencia amplia`;
    return `¡Gol de ${scorer?.name}!`;
  }

  if (goalsA === 0 && goalsB === 0) {
    if (isFinalStretch) return 'Sin goles y el tiempo se acaba';
    if (isLate) return 'Sin goles — el partido sigue abierto';
    return 'Partido sin goles de momento';
  }

  if (goalsA === goalsB) {
    if (isFinalStretch) return `🔥 Empate — todo por decidir en el descuento`;
    if (isLate) return `Empate a ${goalsA} — puede pasar cualquier cosa`;
    return `Igualados a ${goalsA}`;
  }

  if (absDiff >= 3) return `${teamAhead?.name} controla el partido`;

  if (isFinalStretch && absDiff === 1) {
    return `⏱ ${teamAhead?.name} aguanta — ${teamBehind?.name} lo busca`;
  }
  if (isLate && absDiff === 1) return `${teamBehind?.name} busca el empate`;

  return absDiff >= 2
    ? `${teamAhead?.name} con ventaja clara`
    : `${teamAhead?.name} por delante`;
}

function createUpcomingCard(match, state) {
  const nextMatchStartMs = state.cycleStart + match.startMin * 60 * 1000;
  const d = new Date(nextMatchStartMs);
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}h`;

  return el('div', {
    className: 'card p-3',
    children: [
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0',
            children: [
              match.teamA ? flag(match.teamA.code, 20) : null,
              el('span', { text: match.teamA ? match.teamA.name : 'TBD', className: 'text-xs font-medium truncate' }),
            ].filter(Boolean),
          }),
          el('span', {
            text: 'VS',
            className: 'score-num text-[10px] !min-w-[26px] !h-[26px] shrink-0',
          }),
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0 justify-end',
            children: [
              el('span', { text: match.teamB ? match.teamB.name : 'TBD', className: 'text-xs font-medium truncate' }),
              match.teamB ? flag(match.teamB.code, 20) : null,
            ].filter(Boolean),
          }),
        ],
      }),
      el('div', {
        className: 'text-center mt-1.5',
        children: [
          el('span', {
            text: dateStr,
            className: 'text-[11px] text-text-muted tabular-nums',
          }),
        ],
      }),
    ],
  });
}

/* ── Recent matches ── */

function createRecentMatchesSection(recentMatches) {
  return el('div', {
    className: 'mt-6',
    children: [
      el('p', { text: '\u00daltimos partidos', className: 'section-title' }),
      el('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 gap-2',
        children: recentMatches.map(m => createRecentMatchCard(m)),
      }),
    ],
  });
}

function createRecentMatchCard(m) {
  const aWon = m.goalsA > m.goalsB;
  const bWon = m.goalsB > m.goalsA;

  return el('div', {
    className: 'card p-3',
    children: [
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0',
            children: [
              flag(m.teamA.code, 20),
              el('span', { text: m.teamA.name, className: `text-xs truncate ${aWon ? 'font-bold' : ''}` }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-1 shrink-0',
            children: [
              el('span', {
                text: String(m.goalsA),
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${aWon ? 'score-num-winner' : ''}`,
              }),
              el('span', { text: '-', className: 'text-text-muted text-[10px]' }),
              el('span', {
                text: String(m.goalsB),
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${bWon ? 'score-num-winner' : ''}`,
              }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0 justify-end',
            children: [
              el('span', { text: m.teamB.name, className: `text-xs truncate ${bWon ? 'font-bold' : ''}` }),
              flag(m.teamB.code, 20),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ── Celebration ── */

function renderCelebration(state) {
  const { tournament } = state;
  const champ = tournament.champion;
  const final = tournament.knockout.final;

  return el('div', {
    className: 'text-center py-4',
    children: [
      el('div', { text: '\ud83c\udfc6', className: 'text-6xl mb-4 animate-float' }),
      el('h2', { text: '\u00a1Campe\u00f3n del Mundo!', className: 'text-2xl md:text-3xl font-extrabold mb-2' }),
      el('div', {
        className: 'flex items-center justify-center gap-3 mb-8',
        children: [
          flag(champ.code, 48),
          el('span', { text: champ.name, className: 'text-xl font-bold text-gold' }),
        ],
      }),
      el('div', {
        className: 'card p-5 max-w-md mx-auto mb-8',
        children: [
          el('div', { text: 'FINAL', className: 'text-[11px] text-text-muted text-center mb-4 font-semibold tracking-widest' }),
          el('div', {
            className: 'flex items-center justify-between gap-4',
            children: [
              el('div', {
                className: 'flex-1 text-center',
                children: [
                  flag(final.teamA.code, 40),
                  el('div', { text: final.teamA.name, className: 'text-sm font-medium mt-1.5' }),
                ],
              }),
              el('div', {
                className: 'flex items-center gap-2 shrink-0',
                children: [
                  el('span', { text: String(final.goalsA), className: 'score-num score-num-lg' }),
                  el('span', { text: '-', className: 'text-text-muted font-bold' }),
                  el('span', { text: String(final.goalsB), className: 'score-num score-num-lg' }),
                ],
              }),
              el('div', {
                className: 'flex-1 text-center',
                children: [
                  flag(final.teamB.code, 40),
                  el('div', { text: final.teamB.name, className: 'text-sm font-medium mt-1.5' }),
                ],
              }),
            ],
          }),
          final.penalties ? el('div', {
            text: `Penales: ${final.penalties.scoreA}-${final.penalties.scoreB}`,
            className: 'text-xs text-text-muted text-center mt-3',
          }) : null,
        ].filter(Boolean),
      }),
      el('div', {
        className: 'flex items-end justify-center gap-4 md:gap-8',
        children: [
          createPodiumSlot(tournament.runnerUp, '2\u00ba', 'h-20 md:h-28'),
          createPodiumSlot(tournament.champion, '1\u00ba', 'h-28 md:h-36', true),
          createPodiumSlot(tournament.thirdPlace, '3\u00ba', 'h-16 md:h-24'),
        ],
      }),
    ],
  });
}

function createPodiumSlot(team, label, heightClass, isChamp = false) {
  return el('div', {
    className: 'flex flex-col items-center',
    children: [
      flag(team.code, isChamp ? 40 : 28),
      el('span', { text: team.name, className: 'text-xs mt-1 text-center font-medium' }),
      el('div', {
        className: `w-20 md:w-28 ${heightClass} rounded-t-xl flex items-start justify-center pt-3 mt-2 ${
          isChamp ? 'bg-gold-light' : 'bg-bg-surface'
        }`,
        children: [
          el('span', { text: label, className: `text-sm font-bold ${isChamp ? 'text-gold' : 'text-text-muted'}` }),
        ],
      }),
    ],
  });
}

/* ── Countdown ── */

function renderCountdown(state) {
  const { nextCycleStart, nextHost, tournament, timestamp } = state;
  const ms = nextCycleStart - timestamp;

  return el('div', {
    className: 'py-4',
    children: [
      el('div', {
        className: 'card p-6 text-center mb-6',
        children: [
          el('div', { text: '\ud83c\udfc6', className: 'text-4xl mb-3' }),
          el('p', { text: '\u00daltimo Campe\u00f3n', className: 'text-xs text-text-muted mb-2 uppercase tracking-wider font-semibold' }),
          el('div', {
            className: 'flex items-center justify-center gap-3',
            children: [
              flag(tournament.champion.code, 32),
              el('span', { text: tournament.champion.name, className: 'text-lg font-bold text-gold' }),
            ],
          }),
        ],
      }),
      el('div', {
        className: 'card p-6 md:p-8 text-center',
        children: [
          el('p', { text: 'Pr\u00f3ximo Mundial', className: 'section-title text-center' }),
          nextHost ? el('div', {
            className: 'flex items-center justify-center gap-2.5 mb-5',
            children: [
              flag(nextHost.code, 28),
              el('span', { text: nextHost.name, className: 'text-sm font-semibold' }),
            ],
          }) : null,
          countdownDisplay(ms),
        ].filter(Boolean),
      }),
    ],
  });
}

/* ── Rest phase ── */

function renderRestPhase(state) {
  const { upcoming } = state;
  const children = [];

  children.push(createNextMatchCountdown(state));

  if (upcoming.length > 1) {
    children.push(
      el('div', {
        children: [
          el('p', { text: 'Pr\u00f3ximos', className: 'section-title' }),
          el('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 gap-2',
            children: upcoming.slice(1).map(m => createUpcomingCard(m, state)),
          }),
        ],
      })
    );
  }

  if (state.recentMatches && state.recentMatches.length > 0) {
    children.push(createRecentMatchesSection(state.recentMatches));
  }

  return el('div', { children });
}
