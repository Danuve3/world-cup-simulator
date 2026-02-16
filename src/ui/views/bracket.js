import { el, flag } from '../components.js';

/**
 * Bracket view — Knockout stage.
 */
export function renderBracket(container, state) {
  container.innerHTML = '';

  const { tournament } = state;
  const ko = tournament.knockout;

  container.appendChild(
    el('div', {
      className: 'flex items-center justify-between mb-5',
      children: [
        el('h2', { text: 'Eliminatorias', className: 'text-lg md:text-xl font-bold' }),
        el('div', {
          className: 'flex items-center gap-2',
          children: [
            el('span', { text: '\ud83c\udfc6' }),
            flag(ko.champion.code, 20),
            el('span', { text: ko.champion.name, className: 'text-sm font-bold text-gold' }),
          ],
        }),
      ],
    })
  );

  // Desktop: visual bracket
  container.appendChild(createDesktopBracket(ko));
  // Mobile: stacked rounds
  container.appendChild(createMobileBracket(ko));

  // Third place
  container.appendChild(
    el('div', {
      className: 'mt-6',
      children: [
        el('p', { text: 'Tercer Puesto', className: 'section-title' }),
        createBracketMatch(ko.thirdPlace),
      ],
    })
  );
}

function createDesktopBracket(ko) {
  return el('div', {
    className: 'hidden md:grid grid-cols-7 gap-x-2 items-center mb-4',
    children: [
      createBracketColumn(ko.r16.slice(0, 4), 'Octavos'),
      createBracketColumn(ko.qf.slice(0, 2), 'Cuartos'),
      createBracketColumn(ko.sf.slice(0, 1), 'Semis'),
      createFinalColumn(ko.final),
      createBracketColumn(ko.sf.slice(1, 2), ''),
      createBracketColumn(ko.qf.slice(2, 4), ''),
      createBracketColumn(ko.r16.slice(4, 8), ''),
    ],
  });
}

function createBracketColumn(matches, label) {
  return el('div', {
    className: 'flex flex-col justify-around gap-3 py-2',
    children: [
      label ? el('div', {
        text: label,
        className: 'text-[10px] text-text-muted text-center uppercase tracking-widest font-semibold mb-1',
      }) : el('div'),
      ...matches.map(m => createCompactMatch(m)),
    ],
  });
}

function createFinalColumn(final) {
  return el('div', {
    className: 'flex flex-col items-center justify-center py-4',
    children: [
      el('div', { text: 'FINAL', className: 'text-[10px] text-gold tracking-widest font-bold mb-2' }),
      el('div', { text: '\ud83c\udfc6', className: 'text-3xl mb-2 animate-float' }),
      createBracketMatch(final, true),
    ],
  });
}

function createCompactMatch(match) {
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
  return el('div', {
    className: `flex items-center justify-between py-0.5 px-1 rounded ${isWinner ? 'bg-accent-light' : ''}`,
    children: [
      el('div', {
        className: 'flex items-center gap-1.5 min-w-0 flex-1',
        children: [
          flag(team.code, 14),
          el('span', {
            text: team.name,
            className: `text-[11px] truncate ${isWinner ? 'font-bold text-accent' : ''}`,
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

function createMobileBracket(ko) {
  const rounds = [
    { label: 'Final', matches: [ko.final] },
    { label: 'Semifinales', matches: ko.sf },
    { label: 'Cuartos de Final', matches: ko.qf },
    { label: 'Octavos de Final', matches: ko.r16 },
  ];

  return el('div', {
    className: 'md:hidden space-y-5',
    children: rounds.map(round =>
      el('div', {
        children: [
          el('p', { text: round.label, className: 'section-title' }),
          el('div', {
            className: `grid grid-cols-1 ${round.matches.length > 2 ? 'sm:grid-cols-2' : ''} gap-2`,
            children: round.matches.map(m => createBracketMatch(m)),
          }),
        ],
      })
    ),
  });
}

function createBracketMatch(match, isFinal = false) {
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
              flag(match.teamA.code, 20),
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
              flag(match.teamB.code, 20),
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
