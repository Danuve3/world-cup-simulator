import { el, flag, createPenaltyDisplay } from '../components.js';
import { getKnockoutMatchTiming, getGroupMatchTiming } from '../../engine/timeline.js';
import { computeStandings } from '../../engine/group-stage.js';
import { SCHEDULE } from '../../constants.js';

// Persistent expanded state across re-renders
const expandedMatchIds = new Set();

function createMatchTimeline(m) {
  const events = m.events || [];
  const maxMinute = m.extraTime ? 120 : 90;
  const pct = min => `${Math.min(100, (min / maxMinute) * 100).toFixed(1)}%`;
  const goalsA = events.filter(e => e.team === 'A');
  const goalsB = events.filter(e => e.team === 'B');

  return el('div', {
    className: 'pt-2 pb-0.5 border-t border-border-subtle mt-2 px-1',
    children: [
      events.length === 0
        ? el('p', { text: 'Sin goles', className: 'text-[10px] text-text-muted text-center' })
        : el('div', {
            className: 'flex gap-2 mb-1',
            children: [
              el('div', { className: 'flex-1 flex flex-col gap-0.5 min-w-0', children: goalsA.map(e => el('div', { text: e.scorerName ? `⚽ ${e.minute}' ${e.scorerName}` : `⚽ ${e.minute}'`, className: 'text-[10px] text-accent font-medium truncate' })) }),
              el('div', { className: 'shrink-0 w-4' }),
              el('div', { className: 'flex-1 flex flex-col gap-0.5 items-end min-w-0', children: goalsB.map(e => el('div', { text: e.scorerName ? `${e.scorerName} ${e.minute}' ⚽` : `${e.minute}' ⚽`, className: 'text-[10px] text-live font-medium truncate' })) }),
            ],
          }),
      el('div', {
        className: 'relative h-3',
        children: [
          el('div', { className: 'absolute inset-x-0 top-[5px] h-[1.5px] bg-text-muted/20 w-full rounded-full' }),
          ...events.map(e => el('div', {
            className: `absolute w-1.5 h-1.5 top-1/2 -translate-y-1/2 -translate-x-1 rounded-full ${e.team === 'A' ? 'bg-accent' : 'bg-live'}`,
            style: { left: pct(e.minute) },
          })),
        ],
      }),
      createPenaltyDisplay(m),
    ],
  });
}

function withTimeline(match, cardEl) {
  const detailEl = createMatchTimeline(match);
  detailEl.style.display = expandedMatchIds.has(match.matchId) ? 'block' : 'none';
  cardEl.style.cursor = 'pointer';
  cardEl.addEventListener('click', () => {
    if (expandedMatchIds.has(match.matchId)) {
      expandedMatchIds.delete(match.matchId);
      detailEl.style.display = 'none';
    } else {
      expandedMatchIds.add(match.matchId);
      detailEl.style.display = 'block';
    }
  });
  cardEl.appendChild(detailEl);
  return cardEl;
}

// R16 bracket structure: which group pairs feed each match
const R16_GROUPS = [
  [0, 1], // 1A vs 2B
  [2, 3], // 1C vs 2D
  [4, 5], // 1E vs 2F
  [6, 7], // 1G vs 2H
  [1, 0], // 1B vs 2A
  [3, 2], // 1D vs 2C
  [5, 4], // 1F vs 2E
  [7, 6], // 1H vs 2G
];

/**
 * Returns true if a group position (0=1st, 1=2nd) is mathematically confirmed.
 * Conservative: only confirms when the team is strictly ahead on points,
 * regardless of remaining match outcomes.
 */
function isPositionConfirmed(standings, position) {
  if (!standings || standings.length < 4) return false;
  const team = standings[position];
  if (!team) return false;

  // All 3 matchdays done
  if (standings.every(t => t.played === 3)) return true;

  if (position === 0) {
    const challenger = standings[1];
    if (!challenger) return true;
    return team.points > challenger.points + (3 - challenger.played) * 3;
  }

  if (position === 1) {
    return standings.slice(2).every(t =>
      team.points > t.points + (3 - t.played) * 3
    );
  }

  return false;
}

function sanitizeKnockout(ko, cycleMinute, groupStandings) {
  const ph = name => ({ code: null, name });
  const isMatchDone = (round, idx) => {
    const t = getKnockoutMatchTiming(round, idx);
    return t.endMin <= cycleMinute;
  };

  const resolveGroupPos = (groupIndex, position) => {
    const standings = groupStandings[groupIndex];
    const label = `${position + 1}${String.fromCharCode(65 + groupIndex)}`;
    if (standings && isPositionConfirmed(standings, position)) {
      return standings[position].team;
    }
    return ph(label);
  };

  const r16 = ko.r16.map((m, i) => {
    const [gA, gB] = R16_GROUPS[i];
    return {
      ...m,
      teamA: resolveGroupPos(gA, 0),
      teamB: resolveGroupPos(gB, 1),
    };
  });

  const qf = ko.qf.map((m, i) => ({
    ...m,
    teamA: isMatchDone('R16', i * 2) ? m.teamA : ph('?'),
    teamB: isMatchDone('R16', i * 2 + 1) ? m.teamB : ph('?'),
  }));

  const sf = ko.sf.map((m, i) => ({
    ...m,
    teamA: isMatchDone('QF', i * 2) ? m.teamA : ph('?'),
    teamB: isMatchDone('QF', i * 2 + 1) ? m.teamB : ph('?'),
  }));

  const thirdPlace = {
    ...ko.thirdPlace,
    teamA: isMatchDone('SF', 0) ? ko.thirdPlace.teamA : ph('?'),
    teamB: isMatchDone('SF', 1) ? ko.thirdPlace.teamB : ph('?'),
  };

  const finalMatch = {
    ...ko.final,
    teamA: isMatchDone('SF', 0) ? ko.final.teamA : ph('?'),
    teamB: isMatchDone('SF', 1) ? ko.final.teamB : ph('?'),
  };

  return { ...ko, r16, qf, sf, thirdPlace, final: finalMatch };
}

function teamFlag(team, size) {
  if (!team || !team.code) {
    return el('div', {
      className: 'inline-flex items-center justify-center bg-bg-surface rounded-[2px] shrink-0',
      style: { width: `${size}px`, height: `${Math.round(size * 0.67)}px` },
    });
  }
  return flag(team.code, size);
}

/**
 * Bracket view — Knockout stage with anti-spoiler protection.
 */
export function renderBracket(container, state) {
  container.innerHTML = '';

  const { tournament, cycleMinute } = state;

  // During draw, groups aren't formed yet
  if (cycleMinute < SCHEDULE.DRAW.end) {
    container.appendChild(
      el('h2', { text: 'Eliminatorias', className: 'text-lg md:text-xl font-bold mb-5' })
    );
    container.appendChild(
      el('div', {
        className: 'card p-12 text-center',
        children: [
          el('div', { text: '\ud83c\udfc6', className: 'text-4xl mb-3' }),
          el('p', { text: 'Sorteo en curso', className: 'text-sm text-text-secondary' }),
          el('p', { text: 'Los grupos se revelar\u00e1n al finalizar el sorteo', className: 'text-xs text-text-muted mt-1' }),
        ],
      })
    );
    return;
  }

  // Compute standings from completed group matches for bracket slot resolution
  const completedGroupMatches = tournament.groupStage.matches.filter(m => {
    const timing = getGroupMatchTiming(m.matchday, m.group, m.matchIndex);
    return timing.endMin <= cycleMinute;
  });
  const groupStandings = computeStandings(tournament.draw.groups, completedGroupMatches);

  const ko = sanitizeKnockout(tournament.knockout, cycleMinute, groupStandings);

  // Determine which matches are completed
  const isComplete = (round, idx) => {
    const timing = getKnockoutMatchTiming(round, idx);
    return timing.endMin <= cycleMinute;
  };

  // Check if final is done to show champion
  const finalDone = isComplete('FINAL', 0);

  container.appendChild(
    el('div', {
      className: 'flex items-center justify-between mb-5',
      children: [
        el('h2', { text: 'Eliminatorias', className: 'text-lg md:text-xl font-bold' }),
        finalDone
          ? el('div', {
              className: 'flex items-center gap-2',
              children: [
                el('span', { text: '\ud83c\udfc6' }),
                flag(ko.champion.code, 20),
                el('span', { text: ko.champion.name, className: 'text-sm font-bold text-gold' }),
              ],
            })
          : el('span', { text: 'En curso', className: 'pill' }),
      ],
    })
  );

  const { cycleStart } = state;

  // Desktop: visual bracket
  container.appendChild(createDesktopBracket(ko, isComplete, cycleStart));
  // Mobile: stacked rounds
  container.appendChild(createMobileBracket(ko, isComplete, cycleStart));
}

function matchStartMs(cycleStart, round, idx) {
  const timing = getKnockoutMatchTiming(round, idx);
  return cycleStart + timing.startMin * 60 * 1000;
}

function formatMatchDateTime(ms) {
  const d = new Date(ms);
  return {
    date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

function createDesktopBracket(ko, isComplete, cycleStart) {
  return el('div', {
    className: 'hidden md:grid grid-cols-7 gap-x-2 items-center mb-4',
    children: [
      createBracketColumn(ko.r16.slice(0, 4), 'Octavos', 'R16', 0, isComplete, cycleStart),
      createBracketColumn(ko.qf.slice(0, 2), 'Cuartos', 'QF', 0, isComplete, cycleStart),
      createBracketColumn(ko.sf.slice(0, 1), 'Semis', 'SF', 0, isComplete, cycleStart),
      createFinalColumn(ko, isComplete, cycleStart),
      createBracketColumn(ko.sf.slice(1, 2), '', 'SF', 1, isComplete, cycleStart),
      createBracketColumn(ko.qf.slice(2, 4), '', 'QF', 2, isComplete, cycleStart),
      createBracketColumn(ko.r16.slice(4, 8), '', 'R16', 4, isComplete, cycleStart),
    ],
  });
}

function createBracketColumn(matches, label, round, startIndex, isComplete, cycleStart) {
  return el('div', {
    className: 'flex flex-col justify-around gap-3 py-2',
    children: [
      label ? el('div', {
        text: label,
        className: 'text-[10px] text-text-muted text-center uppercase tracking-widest font-semibold mb-1',
      }) : el('div'),
      ...matches.map((m, i) => createCompactMatch(m, isComplete(round, startIndex + i), matchStartMs(cycleStart, round, startIndex + i))),
    ],
  });
}

function createFinalColumn(ko, isComplete, cycleStart) {
  const finalDone = isComplete('FINAL', 0);
  const thirdDone = isComplete('THIRD', 0);

  return el('div', {
    className: 'flex flex-col items-center justify-center py-4',
    children: [
      el('div', { text: 'FINAL', className: 'text-xs text-gold tracking-widest font-extrabold mb-2' }),
      el('div', { text: '\ud83c\udfc6', className: 'text-4xl mb-3 animate-float' }),
      createFinalMatch(ko.final, finalDone, matchStartMs(cycleStart, 'FINAL', 0)),
      el('div', {
        className: 'mt-4 pt-3 border-t border-border-subtle w-full',
        children: [
          el('div', { text: '3ER PUESTO', className: 'text-[9px] text-text-muted text-center uppercase tracking-widest font-semibold mb-2' }),
          createBracketMatch(ko.thirdPlace, false, thirdDone, matchStartMs(cycleStart, 'THIRD', 0)),
        ],
      }),
    ],
  });
}

function createDateBadge(ms, small = false) {
  const { date, time } = formatMatchDateTime(ms);
  return el('div', {
    className: 'flex flex-col items-end justify-center shrink-0 gap-0.5',
    children: [
      el('span', { text: date, className: `${small ? 'text-[8px]' : 'text-[10px]'} text-text-muted tabular-nums font-medium leading-none` }),
      el('span', { text: time, className: `${small ? 'text-[8px]' : 'text-[10px]'} text-text-muted tabular-nums font-medium leading-none` }),
    ],
  });
}

function createCompactMatch(match, completed, startMs) {
  if (!completed) {
    return el('div', {
      className: 'card p-2 text-xs opacity-60 flex items-center gap-2',
      children: [
        el('div', {
          className: 'flex-1 min-w-0',
          children: [
            createTeamRow(match.teamA, null, false),
            el('div', { className: 'divider my-0.5' }),
            createTeamRow(match.teamB, null, false),
          ],
        }),
        createDateBadge(startMs, true),
      ],
    });
  }
  const winner = match.winner;
  return withTimeline(match, el('div', {
    className: 'card p-2 text-xs',
    children: [
      createTeamRow(match.teamA, match.goalsA, winner === 'A'),
      createTeamRow(match.teamB, match.goalsB, winner === 'B'),
      match.penalties ? el('div', {
        text: `pen ${match.penalties.scoreA}-${match.penalties.scoreB}`,
        className: 'text-[8px] text-text-muted text-center mt-0.5',
      }) : null,
    ].filter(Boolean),
  }));
}

function createTeamRow(team, goals, isWinner) {
  const hasTeam = team && team.code;
  return el('div', {
    className: `flex items-center justify-between py-0.5 px-1 rounded ${isWinner ? 'bg-accent-light' : ''}`,
    children: [
      el('div', {
        className: 'flex items-center gap-1.5 min-w-0 flex-1',
        children: [
          teamFlag(team, 14),
          el('span', {
            text: team?.name || '?',
            className: `text-[11px] truncate ${isWinner ? 'font-bold text-accent' : hasTeam ? '' : 'text-text-muted italic'}`,
          }),
        ],
      }),
      goals !== null ? el('span', {
        text: String(goals),
        className: `tabular-nums text-[11px] ml-1 ${isWinner ? 'text-accent font-bold' : 'text-text-muted'}`,
      }) : null,
    ],
  });
}

function createMobileBracket(ko, isComplete, cycleStart) {
  const rounds = [
    { label: 'Final', matches: [ko.final], round: 'FINAL', isFinal: true },
    { label: 'Tercer Puesto', matches: [ko.thirdPlace], round: 'THIRD' },
    { label: 'Semifinales', matches: ko.sf, round: 'SF' },
    { label: 'Cuartos de Final', matches: ko.qf, round: 'QF' },
    { label: 'Octavos de Final', matches: ko.r16, round: 'R16' },
  ];

  return el('div', {
    className: 'md:hidden space-y-5',
    children: rounds.map(r =>
      el('div', {
        children: [
          el('p', { text: r.label, className: 'section-title' }),
          r.isFinal
            ? createFinalMatch(ko.final, isComplete('FINAL', 0), matchStartMs(cycleStart, 'FINAL', 0))
            : el('div', {
                className: `grid grid-cols-1 ${r.matches.length > 2 ? 'sm:grid-cols-2' : ''} gap-2`,
                children: r.matches.map((m, i) => createBracketMatch(m, false, isComplete(r.round, i), matchStartMs(cycleStart, r.round, i))),
              }),
        ],
      })
    ),
  });
}

function createBracketMatch(match, isFinal = false, completed = true, startMs) {
  const hasTeamA = match.teamA && match.teamA.code;
  const hasTeamB = match.teamB && match.teamB.code;

  if (!completed) {
    return el('div', {
      className: 'card p-3 opacity-60 flex items-center gap-3 w-full',
      children: [
        el('div', {
          className: 'flex-1 min-w-0',
          children: [
            el('div', {
              className: 'flex items-center gap-2 py-1.5 px-2',
              children: [
                teamFlag(match.teamA, 20),
                el('span', { text: match.teamA?.name || '?', className: `text-sm ${hasTeamA ? '' : 'text-text-muted italic'}` }),
              ],
            }),
            el('div', { className: 'divider my-1' }),
            el('div', {
              className: 'flex items-center gap-2 py-1.5 px-2',
              children: [
                teamFlag(match.teamB, 20),
                el('span', { text: match.teamB?.name || '?', className: `text-sm ${hasTeamB ? '' : 'text-text-muted italic'}` }),
              ],
            }),
          ],
        }),
        createDateBadge(startMs),
      ],
    });
  }

  const winner = match.winner;
  const cls = isFinal ? 'card p-3 w-full border border-gold/20' : 'card p-3 w-full';

  return withTimeline(match, el('div', {
    className: cls,
    children: [
      el('div', {
        className: `flex items-center justify-between py-1.5 px-2 rounded ${winner === 'A' ? 'bg-accent-light' : ''}`,
        children: [
          el('div', {
            className: 'flex items-center gap-2 min-w-0',
            children: [
              teamFlag(match.teamA, 20),
              el('span', { text: match.teamA.name, className: `text-sm ${winner === 'A' ? 'font-bold text-accent' : ''}` }),
            ],
          }),
          el('span', {
            text: String(match.goalsA),
            className: `text-sm font-bold tabular-nums ${winner === 'A' ? 'text-accent' : 'text-text-muted'}`,
          }),
        ],
      }),
      el('div', {
        className: `flex items-center justify-between py-1.5 px-2 rounded ${winner === 'B' ? 'bg-accent-light' : ''}`,
        children: [
          el('div', {
            className: 'flex items-center gap-2 min-w-0',
            children: [
              teamFlag(match.teamB, 20),
              el('span', { text: match.teamB.name, className: `text-sm ${winner === 'B' ? 'font-bold text-accent' : ''}` }),
            ],
          }),
          el('span', {
            text: String(match.goalsB),
            className: `text-sm font-bold tabular-nums ${winner === 'B' ? 'text-accent' : 'text-text-muted'}`,
          }),
        ],
      }),
      (match.penalties || match.extraTime) ? el('div', {
        text: match.penalties ? `Penaltis: ${match.penalties.scoreA}-${match.penalties.scoreB}` : 'Pr\u00f3rroga',
        className: 'text-[10px] text-text-muted text-center mt-1.5',
      }) : null,
    ].filter(Boolean),
  }));
}

function finalTeamColumn(team, isWinner) {
  const hasTeam = team && team.code;
  return el('div', {
    className: 'flex-1 flex flex-col items-center gap-2',
    children: [
      teamFlag(team, 48),
      el('span', {
        text: team?.name || '?',
        className: `text-xs text-center font-semibold leading-tight ${isWinner ? 'text-accent' : hasTeam ? '' : 'text-text-muted italic'}`,
      }),
    ],
  });
}

function createFinalMatch(match, completed, startMs) {
  if (!completed) {
    const { date, time } = formatMatchDateTime(startMs);
    return el('div', {
      className: 'card p-4 w-full border-2 border-gold/20 bg-gold-light/30 opacity-70',
      children: [
        el('div', {
          className: 'flex items-center gap-2',
          children: [
            finalTeamColumn(match.teamA, false),
            el('div', {
              className: 'flex flex-col items-center justify-center gap-1 shrink-0',
              children: [
                el('span', { text: 'VS', className: 'text-sm font-extrabold text-text-muted tracking-widest' }),
                el('span', { text: date, className: 'text-[10px] text-text-muted tabular-nums font-medium leading-none' }),
                el('span', { text: time, className: 'text-[10px] text-text-muted tabular-nums font-medium leading-none' }),
              ],
            }),
            finalTeamColumn(match.teamB, false),
          ],
        }),
      ],
    });
  }

  const winner = match.winner;
  return withTimeline(match, el('div', {
    className: 'card p-4 w-full border-2 border-gold/30',
    style: { background: 'linear-gradient(135deg, var(--color-bg-card), rgba(251,191,36,0.06))' },
    children: [
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          finalTeamColumn(match.teamA, winner === 'A'),
          el('div', {
            className: 'flex flex-col items-center justify-center gap-0.5 shrink-0',
            children: [
              el('div', {
                className: 'flex items-center gap-1.5',
                children: [
                  el('span', {
                    text: String(match.goalsA),
                    className: `text-2xl font-extrabold tabular-nums ${winner === 'A' ? 'text-accent' : 'text-text-muted'}`,
                  }),
                  el('span', { text: '-', className: 'text-lg font-bold text-text-muted' }),
                  el('span', {
                    text: String(match.goalsB),
                    className: `text-2xl font-extrabold tabular-nums ${winner === 'B' ? 'text-accent' : 'text-text-muted'}`,
                  }),
                ],
              }),
              match.extraTime && !match.penalties
                ? el('span', { text: 'Prórroga', className: 'text-[9px] text-text-muted font-medium' })
                : null,
              match.penalties
                ? el('span', { text: `pen ${match.penalties.scoreA}-${match.penalties.scoreB}`, className: 'text-[9px] text-text-muted font-medium' })
                : null,
            ].filter(Boolean),
          }),
          finalTeamColumn(match.teamB, winner === 'B'),
        ],
      }),
    ],
  }));
}
