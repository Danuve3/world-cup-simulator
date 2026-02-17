import { el, flag, getEditionYear } from '../components.js';
import { getCompletedTournaments } from '../../engine/simulation.js';
import { simulateTournament } from '../../engine/tournament.js';

/**
 * History view — Past World Cups.
 */
export function renderHistory(container, state) {
  container.innerHTML = '';

  container.appendChild(
    el('h2', { text: 'Historial de Mundiales', className: 'text-lg md:text-xl font-bold mb-5' })
  );

  const summaries = getCompletedTournaments(state.timestamp);

  if (summaries.length === 0) {
    container.appendChild(
      el('div', {
        className: 'card p-12 text-center',
        children: [
          el('div', { text: '\ud83d\udcda', className: 'text-4xl mb-3' }),
          el('p', { text: 'A\u00fan no hay mundiales completados', className: 'text-sm text-text-secondary' }),
          el('p', { text: 'El primer mundial terminar\u00e1 pronto...', className: 'text-xs text-text-muted mt-1' }),
        ],
      })
    );
    return;
  }

  const sorted = [...summaries].reverse();
  const listContainer = el('div', {
    className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3',
  });

  let shown = 0;
  const BATCH = 24;

  function renderBatch() {
    const batch = sorted.slice(shown, shown + BATCH);
    for (const summary of batch) {
      listContainer.appendChild(createHistoryCard(summary, () => {
        renderHistoryDetail(container, state, summary.edition);
      }));
    }
    shown += batch.length;
  }

  renderBatch();
  container.appendChild(listContainer);

  if (sorted.length > BATCH) {
    const loadMore = el('button', {
      text: 'Cargar m\u00e1s...',
      className: 'w-full py-3 mt-4 card card-interactive text-sm text-accent text-center font-medium',
      events: {
        click: () => { renderBatch(); if (shown >= sorted.length) loadMore.remove(); },
      },
    });
    container.appendChild(loadMore);
  }
}

function createHistoryCard(summary, onClick) {
  return el('div', {
    className: 'card card-interactive p-4',
    events: { click: onClick },
    children: [
      el('div', {
        className: 'flex items-center justify-between mb-3',
        children: [
          el('div', {
            className: 'flex items-center gap-2',
            children: [
              el('span', { text: `${getEditionYear(summary.edition)}`, className: 'text-xs text-text-muted font-medium' }),
              flag(summary.host.code, 20),
              el('span', { text: summary.host.name, className: 'text-xs text-text-secondary' }),
            ],
          }),
        ],
      }),
      el('div', {
        className: 'flex items-center gap-3 mb-3',
        children: [
          el('div', {
            className: 'w-10 h-10 rounded-xl bg-gold-light flex items-center justify-center',
            children: [flag(summary.champion.code, 24)],
          }),
          el('div', {
            children: [
              el('div', { text: summary.champion.name, className: 'text-sm font-bold text-gold' }),
              el('div', { text: 'Campe\u00f3n', className: 'text-[10px] text-text-muted' }),
            ],
          }),
        ],
      }),
      el('div', {
        className: 'flex gap-2',
        children: [
          el('span', { className: 'pill !py-1 !px-2.5 !text-[10px]', text: `${summary.totalGoals} goles` }),
          summary.runnerUp ? el('span', {
            className: 'pill !py-1 !px-2.5 !text-[10px]',
            text: `vs ${summary.runnerUp.name}`,
          }) : null,
        ].filter(Boolean),
      }),
    ],
  });
}

function renderHistoryDetail(container, state, edition) {
  container.innerHTML = '';

  container.appendChild(
    el('button', {
      className: 'flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer mb-5 font-medium',
      events: { click: () => renderHistory(container, state) },
      children: [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
        el('span', { text: 'Volver al historial' }),
      ],
    })
  );

  const tournament = simulateTournament(edition);

  container.appendChild(
    el('div', {
      className: 'card p-5 md:p-6 mb-6 text-center',
      children: [
        el('div', {
          className: 'flex items-center justify-center gap-3 mb-2',
          children: [
            flag(tournament.host.code, 28),
            el('h2', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-lg font-bold' }),
          ],
        }),
        el('div', {
          className: 'flex items-end justify-center gap-4 md:gap-8 mt-4',
          children: [
            createMiniPodium('\ud83e\udd48', 'Subcampe\u00f3n', tournament.runnerUp),
            createMiniPodium('\ud83c\udfc6', 'Campe\u00f3n', tournament.champion, true),
            createMiniPodium('\ud83e\udd49', 'Tercero', tournament.thirdPlace),
          ],
        }),
      ],
    })
  );

  // Groups — full standings with matches
  container.appendChild(el('p', { text: 'Grupos', className: 'section-title' }));
  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6',
      children: tournament.groupStage.standings.map((table, g) => {
        const letter = String.fromCharCode(65 + g);
        const groupMatches = tournament.groupStage.matches.filter(m => m.group === g);
        const byMatchday = [[], [], []];
        for (const m of groupMatches) byMatchday[m.matchday].push(m);

        return el('div', {
          className: 'card p-4',
          children: [
            el('div', {
              className: 'text-xs font-bold text-text-muted mb-3 uppercase tracking-wider',
              text: `Grupo ${letter}`,
            }),
            createHistoryStandingsHeader(),
            ...table.map((row, i) => createHistoryStandingsRow(row, i)),
            // Matches by matchday
            el('div', {
              className: 'border-t border-border-subtle mt-3 pt-3 space-y-2',
              children: byMatchday.flatMap((dayMatches, day) =>
                dayMatches.length > 0
                  ? [
                      el('div', {
                        className: 'text-[9px] text-text-muted uppercase tracking-wider font-semibold mt-1',
                        text: `Jornada ${day + 1}`,
                      }),
                      ...dayMatches.map(m => createHistoryInlineMatch(m)),
                    ]
                  : []
              ),
            }),
          ],
        });
      }),
    })
  );

  // Knockout rounds
  const ko = tournament.knockout;
  const rounds = [
    { label: 'Octavos de Final', matches: ko.r16 },
    { label: 'Cuartos de Final', matches: ko.qf },
    { label: 'Semifinales', matches: ko.sf },
    { label: 'Tercer Puesto', matches: [ko.thirdPlace] },
    { label: 'Final', matches: [ko.final] },
  ];

  for (const round of rounds) {
    container.appendChild(el('p', { text: round.label, className: 'section-title mt-2' }));
    container.appendChild(
      el('div', {
        className: `grid grid-cols-1 ${round.matches.length > 2 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'} gap-2 mb-4`,
        children: round.matches.map(m => createDetailMatch(m)),
      })
    );
  }
}

function createDetailMatch(m) {
  const aWon = m.winner === 'A';
  const bWon = m.winner === 'B';

  return el('div', {
    className: 'card p-3',
    children: [
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          el('div', {
            className: `flex items-center gap-1.5 flex-1 min-w-0 ${aWon ? 'font-bold' : ''}`,
            children: [flag(m.teamA.code, 20), el('span', { text: m.teamA.name, className: 'text-xs truncate' })],
          }),
          el('div', {
            className: 'flex items-center gap-1 shrink-0',
            children: [
              el('span', {
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${aWon ? 'score-num-winner' : ''}`,
                text: String(m.goalsA),
              }),
              el('span', { text: '-', className: 'text-text-muted text-[10px]' }),
              el('span', {
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${bWon ? 'score-num-winner' : ''}`,
                text: String(m.goalsB),
              }),
            ],
          }),
          el('div', {
            className: `flex items-center gap-1.5 flex-1 min-w-0 justify-end ${bWon ? 'font-bold' : ''}`,
            children: [el('span', { text: m.teamB.name, className: 'text-xs truncate' }), flag(m.teamB.code, 20)],
          }),
        ],
      }),
      (m.penalties || m.extraTime) ? el('div', {
        text: m.penalties ? `pen ${m.penalties.scoreA}-${m.penalties.scoreB}` : 'pr\u00f3rroga',
        className: 'text-[9px] text-text-muted text-center mt-1',
      }) : null,
    ].filter(Boolean),
  });
}

function createHistoryStandingsHeader() {
  const cols = ['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'];
  return el('div', {
    className: 'flex items-center gap-1 pb-1.5 mb-1 border-b border-border-subtle',
    children: [
      el('div', { className: 'w-[3px]' }),
      el('span', { className: 'w-4 shrink-0' }),
      el('span', { className: 'w-5 shrink-0' }),
      el('div', { className: 'flex-1 min-w-0' }),
      ...cols.map(c =>
        el('span', {
          text: c,
          className: `text-[8px] text-text-muted font-semibold tabular-nums text-center ${c === 'Pts' ? 'w-6' : 'w-4'} shrink-0`,
        })
      ),
    ],
  });
}

function createHistoryStandingsRow(row, i) {
  const qualified = i < 2;
  const statClass = 'text-[10px] tabular-nums text-center shrink-0 text-text-secondary';
  return el('div', {
    className: 'flex items-center gap-1 py-1.5',
    children: [
      qualified
        ? el('span', { className: 'qualified-bar' })
        : el('span', { className: 'w-[3px]' }),
      el('span', { text: `${i + 1}`, className: 'text-[10px] text-text-muted w-4 shrink-0 tabular-nums' }),
      flag(row.team.code, 18),
      el('span', {
        text: row.team.name,
        className: `text-xs truncate flex-1 min-w-0 ${qualified ? 'font-medium' : 'text-text-secondary'}`,
      }),
      el('span', { text: String(row.played), className: `${statClass} w-4` }),
      el('span', { text: String(row.won), className: `${statClass} w-4` }),
      el('span', { text: String(row.drawn), className: `${statClass} w-4` }),
      el('span', { text: String(row.lost), className: `${statClass} w-4` }),
      el('span', { text: String(row.goalsFor), className: `${statClass} w-4` }),
      el('span', { text: String(row.goalsAgainst), className: `${statClass} w-4` }),
      el('span', {
        text: row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference),
        className: `text-[10px] tabular-nums text-center w-4 shrink-0 ${
          row.goalDifference > 0 ? 'text-accent font-semibold' : row.goalDifference < 0 ? 'text-live' : 'text-text-muted'
        }`,
      }),
      el('span', {
        text: String(row.points),
        className: `text-xs font-bold tabular-nums text-center w-6 shrink-0 ${qualified ? 'text-accent' : 'text-text-secondary'}`,
      }),
    ],
  });
}

function createHistoryInlineMatch(m) {
  const aWon = m.goalsA > m.goalsB;
  const bWon = m.goalsB > m.goalsA;
  return el('div', {
    className: 'flex items-center gap-1.5 text-[11px]',
    children: [
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0 justify-end',
        children: [
          el('span', { text: m.teamA.name, className: `truncate ${aWon ? 'font-semibold' : 'text-text-secondary'}` }),
          flag(m.teamA.code, 14),
        ],
      }),
      el('span', {
        text: `${m.goalsA} - ${m.goalsB}`,
        className: 'font-bold tabular-nums shrink-0 text-[10px] bg-bg-surface rounded px-1.5 py-0.5',
      }),
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0',
        children: [
          flag(m.teamB.code, 14),
          el('span', { text: m.teamB.name, className: `truncate ${bWon ? 'font-semibold' : 'text-text-secondary'}` }),
        ],
      }),
    ],
  });
}

function createMiniPodium(emoji, label, team, isChamp = false) {
  return el('div', {
    className: `flex flex-col items-center ${isChamp ? '' : 'mt-4'}`,
    children: [
      el('span', { text: emoji, className: isChamp ? 'text-4xl' : 'text-xl' }),
      el('div', {
        className: `rounded-xl flex items-center justify-center mt-1 ${
          isChamp ? 'w-16 h-16 md:w-20 md:h-20 bg-gold-light' : 'w-10 h-10 md:w-12 md:h-12 bg-bg-surface'
        }`,
        children: [flag(team.code, isChamp ? 40 : 22)],
      }),
      el('span', { text: team.name, className: `mt-1.5 font-medium ${isChamp ? 'text-base md:text-lg font-bold text-gold' : 'text-xs'}` }),
      el('span', { text: label, className: 'text-[9px] text-text-muted' }),
    ],
  });
}
