import { el, flag, getEditionYear, createPenaltyDisplay } from '../components.js';
import { getCompletedTournaments } from '../../engine/simulation.js';
import { simulateTournament } from '../../engine/tournament.js';
import { getSquadForEdition } from '../../engine/playerEvolution.js';
import { navigate } from '../router.js';

// Persistent expanded match timelines across re-renders
const expandedMatchIds = new Set();

/**
 * History view — Past World Cups.
 * params[0] = edition → renders detail for that WC edition.
 * params[1] = teamCode → renders squad detail for that team in that edition.
 */
export function renderHistory(container, state, params = []) {
  if (params[1]) {
    renderHistoryTeamDetail(container, state, parseInt(params[0]), params[1]);
    return;
  }
  if (params[0]) {
    renderHistoryDetail(container, state, parseInt(params[0]));
    return;
  }
  renderHistoryList(container, state);
}

function renderHistoryList(container, state) {
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
        navigate('/history/' + summary.edition);
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
    className: 'card card-interactive overflow-hidden',
    events: { click: onClick },
    children: [
      // Header: year + host
      el('div', {
        className: 'flex items-center justify-between px-3.5 py-2 border-b border-border-subtle',
        children: [
          el('span', {
            text: `Mundial ${getEditionYear(summary.edition)}`,
            className: 'text-[10px] font-bold uppercase tracking-widest text-text-muted',
          }),
          el('div', {
            className: 'flex items-center gap-1.5',
            children: [
              flag(summary.host.code, 14),
              el('span', { text: summary.host.name, className: 'text-[10px] text-text-muted' }),
            ],
          }),
        ],
      }),
      // Body
      el('div', {
        className: 'flex',
        children: [
          // Champion — left zone
          el('div', {
            className: 'flex-1 min-w-0 relative overflow-hidden flex flex-col items-center justify-center gap-2 py-4 px-3',
            children: [
              // Flag — hero element
              el('div', {
                className: 'ring-1 ring-black/10 rounded overflow-hidden shadow-sm',
                children: [flag(summary.champion.code, 56)],
              }),
              // Name + label
              el('div', {
                className: 'relative text-center',
                children: [
                  el('div', { text: summary.champion.name, className: 'text-base font-bold text-gold leading-tight' }),
                  el('div', { text: 'Campe\u00f3n', className: 'text-[9px] text-text-muted mt-0.5' }),
                ],
              }),
            ],
          }),
          // Divider
          el('div', { className: 'w-px bg-border-subtle self-stretch my-2' }),
          // Right zone: runner-up + 3rd + stats
          el('div', {
            className: 'w-[46%] shrink-0 p-3 flex flex-col justify-between gap-2',
            children: [
              summary.runnerUp ? el('div', {
                children: [
                  el('div', { text: 'Subcampe\u00f3n', className: 'text-[9px] text-text-muted uppercase tracking-wider font-semibold' }),
                  el('div', {
                    className: 'flex items-center gap-1.5 mt-0.5',
                    children: [
                      flag(summary.runnerUp.code, 14),
                      el('span', { text: summary.runnerUp.name, className: 'text-xs text-text-secondary truncate' }),
                    ],
                  }),
                ],
              }) : null,
              summary.thirdPlace ? el('div', {
                children: [
                  el('div', { text: '3.\u00ba Puesto', className: 'text-[9px] text-text-muted uppercase tracking-wider font-semibold' }),
                  el('div', {
                    className: 'flex items-center gap-1.5 mt-0.5',
                    children: [
                      flag(summary.thirdPlace.code, 14),
                      el('span', { text: summary.thirdPlace.name, className: 'text-xs text-text-secondary truncate' }),
                    ],
                  }),
                ],
              }) : null,
              summary.topScorer ? el('div', {
                children: [
                  el('div', { text: 'Bota de Oro', className: 'text-[9px] text-yellow-500 dark:text-yellow-400 uppercase tracking-wider font-semibold' }),
                  el('div', {
                    className: 'flex items-center gap-1 mt-0.5',
                    children: [
                      el('span', { text: '\u26bd', className: 'text-[10px]' }),
                      el('span', { text: `${summary.topScorer.player.name} (${summary.topScorer.goals})`, className: 'text-[10px] text-text-secondary truncate' }),
                    ],
                  }),
                ],
              }) : null,
              summary.mvp ? el('div', {
                children: [
                  el('div', { text: 'Balón de Oro', className: 'text-[9px] text-yellow-500 dark:text-yellow-400 uppercase tracking-wider font-semibold' }),
                  el('div', {
                    className: 'flex items-center gap-1 mt-0.5',
                    children: [
                      el('span', { text: '\u2b50', className: 'text-[10px]' }),
                      el('span', { text: summary.mvp.player.name, className: 'text-[10px] text-text-secondary truncate' }),
                    ],
                  }),
                ],
              }) : null,
              el('div', {
                className: 'flex items-center gap-2 pt-1 border-t border-border-subtle',
                children: [
                  el('span', { text: `\u26bd ${summary.totalGoals}`, className: 'text-[10px] text-text-muted font-medium tabular-nums' }),
                  el('span', { text: '\u00b7', className: 'text-text-muted' }),
                  el('span', { text: `${summary.totalMatches} partidos`, className: 'text-[10px] text-text-muted tabular-nums' }),
                ],
              }),
            ].filter(Boolean),
          }),
        ],
      }),
    ],
  });
}

function renderHistoryDetail(container, state, edition) {
  container.innerHTML = '';

  container.appendChild(
    el('button', {
      className: 'flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer mb-5 font-medium',
      events: { click: () => navigate('/history') },
      children: [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
        el('span', { text: 'Historial' }),
      ],
    })
  );

  const tournament = simulateTournament(edition);

  // Podium + awards card
  container.appendChild(
    el('div', {
      className: 'card p-5 md:p-6 mb-6',
      children: [
        // Header
        el('div', {
          className: 'flex items-center justify-center gap-3 mb-4',
          children: [
            flag(tournament.host.code, 28),
            el('h2', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-lg font-bold' }),
          ],
        }),
        // Podium
        el('div', {
          className: 'flex items-end justify-center gap-4 md:gap-8',
          children: [
            createMiniPodium('\ud83e\udd48', 'Subcampe\u00f3n', tournament.runnerUp),
            createMiniPodium('\ud83c\udfc6', 'Campe\u00f3n', tournament.champion, true),
            createMiniPodium('\ud83e\udd49', 'Tercero', tournament.thirdPlace),
          ],
        }),
        // Awards row
        el('div', {
          className: 'flex gap-4 mt-5 pt-4 border-t border-border-subtle justify-center flex-wrap',
          children: [
            tournament.topScorer ? createAwardBadge(
              '\u26bd Bota de Oro',
              tournament.topScorer.player.name,
              tournament.topScorer.player.teamCode,
              `${tournament.topScorer.goals} goles`
            ) : null,
            tournament.mvp ? createAwardBadge(
              '\u2b50 Balón de Oro',
              tournament.mvp.player.name,
              tournament.mvp.player.teamCode,
              tournament.mvp.player.position === 'GK' ? 'Portero' :
              tournament.mvp.player.position === 'DF' ? 'Defensa' :
              tournament.mvp.player.position === 'MF' ? 'Centrocampista' : 'Delantero'
            ) : null,
          ].filter(Boolean),
        }),
      ],
    })
  );

  // Teams section — grid that navigates to a dedicated squad page
  container.appendChild(el('p', { text: 'Selecciones', className: 'section-title' }));
  const allTeams = tournament.draw.groups.flat();

  const teamsGrid = el('div', { className: 'grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mb-4' });

  for (const team of allTeams) {
    teamsGrid.appendChild(
      el('button', {
        className: 'card card-interactive flex flex-col items-center gap-2 p-2.5 text-center',
        events: { click: () => navigate('/history/' + edition + '/' + team.code) },
        children: [
          el('div', {
            className: 'ring-1 ring-black/10 rounded overflow-hidden shadow-sm',
            children: [flag(team.code, 36)],
          }),
          el('span', { text: team.name, className: 'text-[10px] text-text-secondary leading-tight line-clamp-2 w-full' }),
        ],
      })
    );
  }

  container.appendChild(teamsGrid);

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

function createMatchTimeline(m) {
  const events = m.events || [];
  const maxMinute = m.extraTime ? 120 : 90;
  const pct = min => `${Math.min(100, (min / maxMinute) * 100).toFixed(1)}%`;
  const goalsA = events.filter(e => e.team === 'A');
  const goalsB = events.filter(e => e.team === 'B');

  return el('div', {
    className: 'pt-2 pb-0.5 border-t border-border-subtle mt-2',
    children: [
      events.length === 0
        ? el('p', { text: 'Sin goles', className: 'text-[10px] text-text-muted text-center' })
        : el('div', {
            className: 'flex gap-2 mb-1',
            children: [
              el('div', { className: 'flex-1 flex flex-col gap-0.5', children: goalsA.map(e => el('div', {
                text: e.scorerName ? `⚽ ${e.minute}' ${e.scorerName}` : `⚽ ${e.minute}'`,
                className: 'text-[10px] text-accent font-medium truncate',
              })) }),
              el('div', { className: 'shrink-0 w-8' }),
              el('div', { className: 'flex-1 flex flex-col gap-0.5 items-end', children: goalsB.map(e => el('div', {
                text: e.scorerName ? `${e.scorerName} ${e.minute}' ⚽` : `${e.minute}' ⚽`,
                className: 'text-[10px] text-live font-medium truncate',
              })) }),
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

function withExpandableTimeline(m, rowEl) {
  const detailEl = createMatchTimeline(m);
  detailEl.style.display = expandedMatchIds.has(m.matchId) ? 'block' : 'none';
  rowEl.style.cursor = 'pointer';
  rowEl.addEventListener('click', () => {
    if (expandedMatchIds.has(m.matchId)) {
      expandedMatchIds.delete(m.matchId);
      detailEl.style.display = 'none';
    } else {
      expandedMatchIds.add(m.matchId);
      detailEl.style.display = 'block';
    }
  });
  return el('div', { children: [rowEl, detailEl] });
}

function createDetailMatch(m) {
  const aWon = m.winner === 'A';
  const bWon = m.winner === 'B';

  const row = el('div', {
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

  return withExpandableTimeline(m, row);
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
  const row = el('div', {
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
  return withExpandableTimeline(m, row);
}

function createAwardBadge(title, name, teamCode, sub) {
  return el('div', {
    className: 'flex flex-col items-center gap-1',
    children: [
      el('span', { text: title, className: 'text-[9px] uppercase tracking-wider font-bold text-yellow-500 dark:text-yellow-400' }),
      el('div', { className: 'ring-1 ring-black/10 rounded overflow-hidden', children: [flag(teamCode, 24)] }),
      el('span', { text: name, className: 'text-xs font-semibold text-text-primary text-center' }),
      el('span', { text: sub, className: 'text-[9px] text-text-muted' }),
    ],
  });
}

const POS_SHORT_H = { GK: 'POR', DF: 'DEF', MF: 'MED', FW: 'DEL' };
const POS_COLOR_H = {
  GK: 'text-yellow-500 dark:text-yellow-400',
  DF: 'text-blue-500 dark:text-blue-400',
  MF: 'text-green-500 dark:text-green-400',
  FW: 'text-red-500 dark:text-red-400',
};
const POS_ORDER_H = ['GK', 'DF', 'MF', 'FW'];

function renderHistoryTeamDetail(container, state, edition, teamCode) {
  container.innerHTML = '';

  const tournament = simulateTournament(edition);
  const allTeams = tournament.draw.groups.flat();
  const team = allTeams.find(t => t.code === teamCode);

  if (!team) {
    container.appendChild(el('p', { text: 'Equipo no encontrado.', className: 'text-sm text-text-muted' }));
    return;
  }

  // Back button → edition detail
  container.appendChild(
    el('button', {
      className: 'flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer mb-5 font-medium',
      events: { click: () => navigate('/history/' + edition) },
      children: [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
        el('span', { text: `Mundial ${getEditionYear(edition)}` }),
      ],
    })
  );

  // Team header
  container.appendChild(
    el('div', {
      className: 'card p-5 mb-4 flex items-center gap-4',
      children: [
        el('div', {
          className: 'ring-1 ring-black/10 rounded overflow-hidden shadow-sm shrink-0',
          children: [flag(team.code, 64)],
        }),
        el('div', { children: [
          el('h2', { text: team.name, className: 'text-xl font-bold' }),
          el('p', { text: `Rating: ${team.rating}`, className: 'text-sm text-text-muted mt-0.5' }),
          el('p', { text: `Mundial ${getEditionYear(edition)}`, className: 'text-xs text-text-muted' }),
        ] }),
      ],
    })
  );

  // Squad table with tournament stats
  const squad = getSquadForEdition(team.code, edition);
  const playerStats = tournament.playerStats || {};
  const sorted = [...squad].sort((a, b) => {
    const po = POS_ORDER_H.indexOf(a.position) - POS_ORDER_H.indexOf(b.position);
    return po !== 0 ? po : b.rating - a.rating;
  });

  const rows = sorted.map(player => {
    const stats = playerStats[player.id] || { goals: 0, matches: 0, mins: 0 };
    return el('div', {
      className: 'flex items-center gap-2 px-3 py-1.5 hover:bg-bg-hover/40 text-xs',
      children: [
        el('span', { text: POS_SHORT_H[player.position], className: `w-7 shrink-0 font-bold ${POS_COLOR_H[player.position]}` }),
        el('span', { text: player.name, className: 'flex-1 min-w-0 truncate text-text-primary' }),
        el('span', { text: player.rating, className: 'w-6 text-right text-text-muted font-mono' }),
        el('span', { text: player.age, className: 'w-6 text-right text-text-muted' }),
        el('span', { text: stats.goals > 0 ? String(stats.goals) : '', className: 'w-8 text-right text-text-secondary font-medium' }),
        el('span', { text: `${stats.mins}'`, className: 'w-10 text-right text-text-muted font-mono' }),
      ],
    });
  });

  container.appendChild(
    el('div', {
      className: 'card overflow-hidden',
      children: [
        el('div', {
          className: 'flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle text-[10px] font-bold uppercase tracking-wider text-text-muted',
          children: [
            el('span', { text: 'Pos', className: 'w-7 shrink-0' }),
            el('span', { text: 'Jugador', className: 'flex-1' }),
            el('span', { text: 'Rtg', className: 'w-6 text-right' }),
            el('span', { text: 'Edad', className: 'w-6 text-right' }),
            el('span', { text: 'Goles', className: 'w-8 text-right' }),
            el('span', { text: 'Mins', className: 'w-10 text-right' }),
          ],
        }),
        ...rows,
      ],
    })
  );
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
