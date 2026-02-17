import { el, flag, formatMinutes, formatCountdown, countdownDisplay, formatTime, getEditionYear } from '../components.js';
import { SCHEDULE } from '../../constants.js';
import { TEAMS } from '../../engine/teams.js';

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
                f.style.height = '34px';
                f.style.width = 'auto';
                return f;
              })(),
              el('div', {
                children: [
                  el('h2', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-base font-bold leading-tight' }),
                  el('span', { text: tournament.host.name, className: 'text-sm text-text-secondary leading-tight' }),
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

  const matchupChildren = [
    current.teamA ? el('div', {
      className: 'flex items-center gap-2',
      children: [flag(current.teamA.code, 24), el('span', { text: current.teamA.name, className: 'text-sm font-medium' })],
    }) : el('span', { text: 'TBD', className: 'text-sm text-text-muted' }),
    el('span', { text: 'vs', className: 'text-xs text-text-muted font-medium' }),
    current.teamB ? el('div', {
      className: 'flex items-center gap-2',
      children: [el('span', { text: current.teamB.name, className: 'text-sm font-medium' }), flag(current.teamB.code, 24)],
    }) : el('span', { text: 'TBD', className: 'text-sm text-text-muted' }),
  ].filter(Boolean);

  const roundLabel = current.type === 'group'
    ? `Grupo ${String.fromCharCode(65 + current.group)}`
    : current.round ? getRoundLabel(current.round) : null;

  const children = [
    el('p', { text: `Pr\u00f3ximo partido${hasCarousel ? 's' : ''} en`, className: 'text-sm text-text-muted mb-4' }),
    el('div', { className: 'mb-5', children: [countdownDisplay(msUntil)] }),
  ];

  if (hasCarousel) {
    children.push(
      el('div', {
        className: 'flex items-center justify-center gap-3',
        children: [
          el('button', {
            className: 'w-7 h-7 flex items-center justify-center rounded-full bg-bg-surface text-text-muted hover:text-text-primary transition-colors',
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="15,18 9,12 15,6"/></svg>',
            events: { click: () => { carouselIndex = (carouselIndex - 1 + sameTimeMatches.length) % sameTimeMatches.length; } },
          }),
          el('div', {
            className: 'flex flex-col items-center',
            children: [
              el('div', { className: 'flex items-center justify-center gap-4', children: matchupChildren }),
              roundLabel ? el('p', { text: roundLabel, className: 'text-xs text-text-muted mt-2' }) : null,
            ].filter(Boolean),
          }),
          el('button', {
            className: 'w-7 h-7 flex items-center justify-center rounded-full bg-bg-surface text-text-muted hover:text-text-primary transition-colors',
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="9,18 15,12 9,6"/></svg>',
            events: { click: () => { carouselIndex = (carouselIndex + 1) % sameTimeMatches.length; } },
          }),
        ],
      })
    );
    // Dots
    children.push(
      el('div', {
        className: 'flex items-center justify-center gap-1.5 mt-3',
        children: sameTimeMatches.map((_, i) =>
          el('span', {
            className: `w-1.5 h-1.5 rounded-full ${i === carouselIndex ? 'bg-accent' : 'bg-bg-surface'}`,
          })
        ),
      })
    );
  } else {
    children.push(
      el('div', { className: 'flex items-center justify-center gap-4', children: matchupChildren }),
    );
    if (roundLabel) {
      children.push(el('p', { text: roundLabel, className: 'text-xs text-text-muted mt-3' }));
    }
  }

  return el('div', {
    className: 'card p-6 md:p-8 text-center mb-6',
    children,
  });
}

function getRoundLabel(round) {
  const labels = { R16: 'Octavos de Final', QF: 'Cuartos de Final', SF: 'Semifinal', THIRD: 'Tercer Puesto', FINAL: 'Final' };
  return labels[round] || round;
}

function createLiveMatchCard(match) {
  return el('div', {
    className: 'card p-4 border-l-3 border-l-live',
    children: [
      el('div', {
        className: 'flex justify-between items-center mb-3',
        children: [
          el('span', {
            text: match.type === 'group'
              ? `Grupo ${String.fromCharCode(65 + match.group)}`
              : getRoundLabel(match.round) || '',
            className: 'text-[11px] text-text-muted font-medium uppercase tracking-wider',
          }),
          el('div', {
            className: 'flex items-center gap-1.5',
            children: [
              el('span', { className: 'live-dot' }),
              el('span', {
                text: `${match.matchMinute || match.currentMinute || 0}'`,
                className: 'text-xs text-live font-bold tabular-nums',
              }),
            ],
          }),
        ],
      }),
      el('div', {
        className: 'flex items-center gap-3',
        children: [
          el('div', {
            className: 'flex-1 min-w-0',
            children: [
              el('div', {
                className: 'flex items-center gap-2',
                children: [
                  flag(match.teamA?.code, 24),
                  el('span', { text: match.teamA?.name || '?', className: 'text-sm font-medium truncate' }),
                ],
              }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-1.5 shrink-0',
            children: [
              el('span', {
                text: String(match.goalsA ?? 0),
                className: `score-num ${(match.goalsA ?? 0) > (match.goalsB ?? 0) ? 'score-num-winner' : ''}`,
              }),
              el('span', { text: ':', className: 'text-text-muted text-xs font-bold' }),
              el('span', {
                text: String(match.goalsB ?? 0),
                className: `score-num ${(match.goalsB ?? 0) > (match.goalsA ?? 0) ? 'score-num-winner' : ''}`,
              }),
            ],
          }),
          el('div', {
            className: 'flex-1 min-w-0 text-right',
            children: [
              el('div', {
                className: 'flex items-center gap-2 justify-end',
                children: [
                  el('span', { text: match.teamB?.name || '?', className: 'text-sm font-medium truncate' }),
                  flag(match.teamB?.code, 24),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createUpcomingCard(match, state) {
  const nextMatchStartMs = state.cycleStart + match.startMin * 60 * 1000;
  const msUntil = nextMatchStartMs - state.timestamp;
  const minsAway = Math.max(0, Math.floor(msUntil / 60000));

  return el('div', {
    className: 'card p-3 flex flex-col items-center gap-1.5',
    children: [
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          match.teamA ? flag(match.teamA.code, 20) : null,
          el('span', { text: match.teamA ? match.teamA.name : 'TBD', className: 'text-xs font-medium' }),
          el('span', { text: 'vs', className: 'text-[10px] text-text-muted mx-1' }),
          el('span', { text: match.teamB ? match.teamB.name : 'TBD', className: 'text-xs font-medium' }),
          match.teamB ? flag(match.teamB.code, 20) : null,
        ].filter(Boolean),
      }),
      el('span', {
        text: `en ${formatMinutes(minsAway)}`,
        className: 'text-[11px] text-text-muted tabular-nums',
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
