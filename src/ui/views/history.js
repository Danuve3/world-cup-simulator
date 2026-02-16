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

  // Groups
  container.appendChild(el('p', { text: 'Grupos', className: 'section-title' }));
  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6',
      children: tournament.groupStage.standings.map((table, g) => {
        const letter = String.fromCharCode(65 + g);
        return el('div', {
          className: 'card p-3',
          children: [
            el('div', {
              className: 'text-xs font-bold text-text-muted mb-2 uppercase tracking-wider',
              text: `Grupo ${letter}`,
            }),
            ...table.map((row, i) =>
              el('div', {
                className: `flex items-center justify-between py-1 text-xs ${i < 2 ? '' : 'opacity-50'}`,
                children: [
                  el('div', {
                    className: 'flex items-center gap-1.5',
                    children: [
                      el('span', { text: `${i + 1}`, className: 'text-[9px] text-text-muted w-3' }),
                      flag(row.team.code, 14),
                      el('span', { text: row.team.name, className: 'truncate' }),
                    ],
                  }),
                  el('span', {
                    text: `${row.points}`,
                    className: `tabular-nums font-bold ${i < 2 ? 'text-accent' : 'text-text-muted'}`,
                  }),
                ],
              })
            ),
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

function createMiniPodium(emoji, label, team, isChamp = false) {
  return el('div', {
    className: 'flex flex-col items-center',
    children: [
      el('span', { text: emoji, className: isChamp ? 'text-3xl' : 'text-xl' }),
      el('div', {
        className: `w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mt-1 ${
          isChamp ? 'bg-gold-light' : 'bg-bg-surface'
        }`,
        children: [flag(team.code, isChamp ? 28 : 22)],
      }),
      el('span', { text: team.name, className: `text-xs mt-1.5 font-medium ${isChamp ? 'text-gold' : ''}` }),
      el('span', { text: label, className: 'text-[9px] text-text-muted' }),
    ],
  });
}
