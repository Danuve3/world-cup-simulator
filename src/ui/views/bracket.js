import { el, flag } from '../components.js';
import { getKnockoutMatchTiming, getGroupMatchTiming } from '../../engine/timeline.js';
import { SCHEDULE } from '../../constants.js';

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

function isGroupComplete(g, cycleMinute) {
  const t = getGroupMatchTiming(2, g, 0);
  return t.endMin <= cycleMinute;
}

function sanitizeKnockout(ko, cycleMinute) {
  const ph = name => ({ code: null, name });
  const isMatchDone = (round, idx) => {
    const t = getKnockoutMatchTiming(round, idx);
    return t.endMin <= cycleMinute;
  };

  const r16 = ko.r16.map((m, i) => {
    const [gA, gB] = R16_GROUPS[i];
    return {
      ...m,
      teamA: isGroupComplete(gA, cycleMinute) ? m.teamA : ph(`1${String.fromCharCode(65 + gA)}`),
      teamB: isGroupComplete(gB, cycleMinute) ? m.teamB : ph(`2${String.fromCharCode(65 + gB)}`),
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

  // Hide bracket until at least one group is complete
  let anyGroupComplete = false;
  for (let g = 0; g < 8; g++) {
    if (isGroupComplete(g, cycleMinute)) {
      anyGroupComplete = true;
      break;
    }
  }

  if (!anyGroupComplete) {
    container.appendChild(
      el('h2', { text: 'Eliminatorias', className: 'text-lg md:text-xl font-bold mb-5' })
    );
    container.appendChild(
      el('div', {
        className: 'card p-12 text-center',
        children: [
          el('div', { text: '\ud83c\udfc6', className: 'text-4xl mb-3' }),
          el('p', {
            text: cycleMinute < SCHEDULE.DRAW.end ? 'Sorteo en curso' : 'Fase de grupos en juego',
            className: 'text-sm text-text-secondary',
          }),
          el('p', {
            text: 'El bracket se revelar\u00e1 conforme finalicen los grupos',
            className: 'text-xs text-text-muted mt-1',
          }),
        ],
      })
    );
    return;
  }

  const ko = sanitizeKnockout(tournament.knockout, cycleMinute);

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

  // Desktop: visual bracket
  container.appendChild(createDesktopBracket(ko, isComplete));
  // Mobile: stacked rounds
  container.appendChild(createMobileBracket(ko, isComplete));
}

function createDesktopBracket(ko, isComplete) {
  return el('div', {
    className: 'hidden md:grid grid-cols-7 gap-x-2 items-center mb-4',
    children: [
      createBracketColumn(ko.r16.slice(0, 4), 'Octavos', 'R16', 0, isComplete),
      createBracketColumn(ko.qf.slice(0, 2), 'Cuartos', 'QF', 0, isComplete),
      createBracketColumn(ko.sf.slice(0, 1), 'Semis', 'SF', 0, isComplete),
      createFinalColumn(ko, isComplete),
      createBracketColumn(ko.sf.slice(1, 2), '', 'SF', 1, isComplete),
      createBracketColumn(ko.qf.slice(2, 4), '', 'QF', 2, isComplete),
      createBracketColumn(ko.r16.slice(4, 8), '', 'R16', 4, isComplete),
    ],
  });
}

function createBracketColumn(matches, label, round, startIndex, isComplete) {
  return el('div', {
    className: 'flex flex-col justify-around gap-3 py-2',
    children: [
      label ? el('div', {
        text: label,
        className: 'text-[10px] text-text-muted text-center uppercase tracking-widest font-semibold mb-1',
      }) : el('div'),
      ...matches.map((m, i) => createCompactMatch(m, isComplete(round, startIndex + i))),
    ],
  });
}

function createFinalColumn(ko, isComplete) {
  const finalDone = isComplete('FINAL', 0);
  const thirdDone = isComplete('THIRD', 0);

  return el('div', {
    className: 'flex flex-col items-center justify-center py-4',
    children: [
      el('div', { text: 'FINAL', className: 'text-xs text-gold tracking-widest font-extrabold mb-2' }),
      el('div', { text: '\ud83c\udfc6', className: 'text-4xl mb-3 animate-float' }),
      createFinalMatch(ko.final, finalDone),
      el('div', {
        className: 'mt-4 pt-3 border-t border-border-subtle w-full',
        children: [
          el('div', { text: '3ER PUESTO', className: 'text-[9px] text-text-muted text-center uppercase tracking-widest font-semibold mb-2' }),
          createBracketMatch(ko.thirdPlace, false, thirdDone),
        ],
      }),
    ],
  });
}

function createCompactMatch(match, completed) {
  if (!completed) {
    return el('div', {
      className: 'card p-2 text-xs opacity-50',
      children: [
        createTeamRow(match.teamA, '?', false),
        el('div', { className: 'divider my-0.5' }),
        createTeamRow(match.teamB, '?', false),
      ],
    });
  }
  const winner = match.winner;
  return el('div', {
    className: 'card p-2 text-xs',
    children: [
      createTeamRow(match.teamA, match.goalsA, winner === 'A'),
      el('div', { className: 'divider my-0.5' }),
      createTeamRow(match.teamB, match.goalsB, winner === 'B'),
      match.penalties ? el('div', {
        text: `pen ${match.penalties.scoreA}-${match.penalties.scoreB}`,
        className: 'text-[8px] text-text-muted text-center mt-0.5',
      }) : null,
    ].filter(Boolean),
  });
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
      el('span', {
        text: String(goals),
        className: `tabular-nums text-[11px] ml-1 ${isWinner ? 'text-accent font-bold' : 'text-text-muted'}`,
      }),
    ],
  });
}

function createMobileBracket(ko, isComplete) {
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
            ? createFinalMatch(ko.final, isComplete('FINAL', 0))
            : el('div', {
                className: `grid grid-cols-1 ${r.matches.length > 2 ? 'sm:grid-cols-2' : ''} gap-2`,
                children: r.matches.map((m, i) => createBracketMatch(m, false, isComplete(r.round, i))),
              }),
        ],
      })
    ),
  });
}

function createBracketMatch(match, isFinal = false, completed = true) {
  const hasTeamA = match.teamA && match.teamA.code;
  const hasTeamB = match.teamB && match.teamB.code;

  if (!completed) {
    return el('div', {
      className: 'card p-3 max-w-sm opacity-50',
      children: [
        el('div', {
          className: 'flex items-center justify-between py-1.5 px-2',
          children: [
            el('div', {
              className: 'flex items-center gap-2 min-w-0',
              children: [
                teamFlag(match.teamA, 20),
                el('span', { text: match.teamA?.name || '?', className: `text-sm ${hasTeamA ? '' : 'text-text-muted italic'}` }),
              ],
            }),
            el('span', { text: '?', className: 'text-sm font-bold tabular-nums text-text-muted' }),
          ],
        }),
        el('div', { className: 'divider my-1' }),
        el('div', {
          className: 'flex items-center justify-between py-1.5 px-2',
          children: [
            el('div', {
              className: 'flex items-center gap-2 min-w-0',
              children: [
                teamFlag(match.teamB, 20),
                el('span', { text: match.teamB?.name || '?', className: `text-sm ${hasTeamB ? '' : 'text-text-muted italic'}` }),
              ],
            }),
            el('span', { text: '?', className: 'text-sm font-bold tabular-nums text-text-muted' }),
          ],
        }),
      ],
    });
  }

  const winner = match.winner;
  const cls = isFinal ? 'card p-3 w-full max-w-[220px] border border-gold/20' : 'card p-3 max-w-sm';

  return el('div', {
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
      el('div', { className: 'divider my-1' }),
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
        text: match.penalties ? `Penales: ${match.penalties.scoreA}-${match.penalties.scoreB}` : 'Pr\u00f3rroga',
        className: 'text-[10px] text-text-muted text-center mt-1.5',
      }) : null,
    ].filter(Boolean),
  });
}

function createFinalMatch(match, completed) {
  const hasTeamA = match.teamA && match.teamA.code;
  const hasTeamB = match.teamB && match.teamB.code;

  if (!completed) {
    return el('div', {
      className: 'card p-5 w-full max-w-xs mx-auto border-2 border-gold/20 bg-gold-light/30 opacity-60',
      children: [
        el('div', {
          className: 'flex items-center justify-between py-2 px-3',
          children: [
            el('div', {
              className: 'flex items-center gap-3 min-w-0',
              children: [
                teamFlag(match.teamA, 40),
                el('span', { text: match.teamA?.name || '?', className: `text-base ${hasTeamA ? 'font-semibold' : 'text-text-muted italic'}` }),
              ],
            }),
            el('span', { text: '?', className: 'text-xl font-bold text-text-muted' }),
          ],
        }),
        el('div', { className: 'divider my-1.5' }),
        el('div', {
          className: 'flex items-center justify-between py-2 px-3',
          children: [
            el('div', {
              className: 'flex items-center gap-3 min-w-0',
              children: [
                teamFlag(match.teamB, 40),
                el('span', { text: match.teamB?.name || '?', className: `text-base ${hasTeamB ? 'font-semibold' : 'text-text-muted italic'}` }),
              ],
            }),
            el('span', { text: '?', className: 'text-xl font-bold text-text-muted' }),
          ],
        }),
      ],
    });
  }

  const winner = match.winner;
  return el('div', {
    className: 'card p-5 w-full max-w-xs mx-auto border-2 border-gold/30',
    style: { background: 'linear-gradient(135deg, var(--color-bg-card), rgba(251,191,36,0.06))' },
    children: [
      el('div', {
        className: `flex items-center justify-between py-2 px-3 rounded-lg ${winner === 'A' ? 'bg-accent-light' : ''}`,
        children: [
          el('div', {
            className: 'flex items-center gap-3 min-w-0',
            children: [
              teamFlag(match.teamA, 40),
              el('span', { text: match.teamA.name, className: `text-base ${winner === 'A' ? 'font-bold text-accent' : 'font-semibold'}` }),
            ],
          }),
          el('span', {
            text: String(match.goalsA),
            className: `score-num score-num-lg ${winner === 'A' ? 'score-num-winner' : ''}`,
          }),
        ],
      }),
      el('div', { className: 'divider my-1.5' }),
      el('div', {
        className: `flex items-center justify-between py-2 px-3 rounded-lg ${winner === 'B' ? 'bg-accent-light' : ''}`,
        children: [
          el('div', {
            className: 'flex items-center gap-3 min-w-0',
            children: [
              teamFlag(match.teamB, 40),
              el('span', { text: match.teamB.name, className: `text-base ${winner === 'B' ? 'font-bold text-accent' : 'font-semibold'}` }),
            ],
          }),
          el('span', {
            text: String(match.goalsB),
            className: `score-num score-num-lg ${winner === 'B' ? 'score-num-winner' : ''}`,
          }),
        ],
      }),
      (match.penalties || match.extraTime) ? el('div', {
        text: match.penalties ? `Penales: ${match.penalties.scoreA}-${match.penalties.scoreB}` : 'Pr\u00f3rroga',
        className: 'text-xs text-text-muted text-center mt-2',
      }) : null,
    ].filter(Boolean),
  });
}
