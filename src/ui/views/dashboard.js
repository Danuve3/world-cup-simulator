import { el, flag, formatMinutes, formatCountdown, countdownDisplay, formatTime, getEditionYear } from '../components.js';
import { SCHEDULE } from '../../constants.js';

/**
 * Dashboard / "En Vivo" view.
 */
export function renderDashboard(container, state) {
  container.innerHTML = '';

  const { phase } = state;

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
        className: 'flex items-center justify-between mb-4',
        children: [
          el('div', {
            className: 'flex items-center gap-3',
            children: [
              el('div', {
                className: 'w-11 h-11 rounded-xl bg-bg-surface flex items-center justify-center',
                children: [flag(tournament.host.code, 28)],
              }),
              el('div', {
                children: [
                  el('h2', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-base font-bold' }),
                  el('span', { text: tournament.host.name, className: 'text-sm text-text-secondary' }),
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

function renderDrawPhase(state) {
  const { tournament, phase, cycleStart, timestamp } = state;
  const drawSequence = tournament.draw.drawSequence;
  const totalTeams = drawSequence.length;
  const revealedCount = Math.floor(phase.phaseProgress * totalTeams);

  const drawDurationMs = (SCHEDULE.DRAW.end - SCHEDULE.DRAW.start) * 60 * 1000;
  const revealIntervalMs = drawDurationMs / totalTeams;
  const phaseElapsedMs = (timestamp - cycleStart) - (SCHEDULE.DRAW.start * 60 * 1000);
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

  if (revealedCount < totalTeams) {
    const msLeft = Math.max(0, nextRevealMs);
    children.push(
      el('div', {
        className: 'card p-5 mb-5 text-center',
        children: [
          el('p', { text: 'Siguiente equipo en', className: 'text-xs text-text-muted mb-3' }),
          countdownDisplay(msLeft, { size: 'sm' }),
        ],
      })
    );
  }

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
                return show
                  ? el('div', {
                      className: 'flex items-center gap-2 py-1 animate-slide-up',
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

  return el('div', { children });
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
  const nextMatchStartMs = state.cycleStart + next.startMin * 60 * 1000;
  const msUntil = nextMatchStartMs - state.timestamp;

  return el('div', {
    className: 'card p-6 md:p-8 text-center mb-6',
    children: [
      el('p', { text: 'Pr\u00f3ximo partido en', className: 'text-sm text-text-muted mb-4' }),
      el('div', { className: 'mb-5', children: [countdownDisplay(msUntil)] }),
      el('div', {
        className: 'flex items-center justify-center gap-4',
        children: [
          next.teamA ? el('div', {
            className: 'flex items-center gap-2',
            children: [flag(next.teamA.code, 24), el('span', { text: next.teamA.name, className: 'text-sm font-medium' })],
          }) : el('span', { text: 'TBD', className: 'text-sm text-text-muted' }),
          el('span', { text: 'vs', className: 'text-xs text-text-muted font-medium' }),
          next.teamB ? el('div', {
            className: 'flex items-center gap-2',
            children: [el('span', { text: next.teamB.name, className: 'text-sm font-medium' }), flag(next.teamB.code, 24)],
          }) : el('span', { text: 'TBD', className: 'text-sm text-text-muted' }),
        ].filter(Boolean),
      }),
      next.type === 'group'
        ? el('p', { text: `Grupo ${String.fromCharCode(65 + next.group)}`, className: 'text-xs text-text-muted mt-3' })
        : next.round
          ? el('p', { text: getRoundLabel(next.round), className: 'text-xs text-text-muted mt-3' })
          : null,
    ].filter(Boolean),
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
    className: 'card p-3 flex items-center justify-between',
    children: [
      el('div', {
        className: 'flex items-center gap-2 min-w-0 flex-1',
        children: [
          match.teamA ? flag(match.teamA.code, 20) : null,
          el('span', { text: match.teamA ? match.teamA.name : 'TBD', className: 'text-xs truncate' }),
          el('span', { text: 'vs', className: 'text-[10px] text-text-muted mx-1' }),
          el('span', { text: match.teamB ? match.teamB.name : 'TBD', className: 'text-xs truncate' }),
          match.teamB ? flag(match.teamB.code, 20) : null,
        ].filter(Boolean),
      }),
      el('span', {
        text: formatMinutes(minsAway),
        className: 'text-xs text-text-muted tabular-nums shrink-0 ml-2',
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

  return el('div', { children });
}
