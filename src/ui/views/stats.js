import { el, flag, getEditionYear, createPenaltyDisplay } from '../components.js';
import { getLiveStats } from '../../engine/simulation.js';
import { simulateTournament } from '../../engine/tournament.js';
import { getTeamByCode, TEAMS } from '../../engine/teams.js';

// Persists expanded state across re-renders during live updates
const expandedSections = new Set();
// Persists expanded match detail state (keyed by "edition-matchId")
const expandedMatchIds = new Set();

/**
 * Stats view — Rankings and records (with live data from current tournament).
 */
export function renderStats(container, state) {
  container.innerHTML = '';

  container.appendChild(
    el('h2', { text: 'Estad\u00edsticas', className: 'text-lg md:text-xl font-bold mb-5' })
  );

  const stats = getLiveStats(state.timestamp);

  if (stats.totalTournaments === 0 && !stats.hasLiveData) {
    container.appendChild(
      el('div', {
        className: 'card p-12 text-center',
        children: [
          el('div', { text: '\ud83d\udcc8', className: 'text-4xl mb-3' }),
          el('p', { text: 'Las estad\u00edsticas se llenar\u00e1n cuando se completen mundiales', className: 'text-sm text-text-secondary' }),
        ],
      })
    );
    return;
  }

  // Overview
  const totalTournaments = stats.totalTournaments + (stats.hasLiveData ? 1 : 0);
  const uniqueTeams = Object.keys(stats.participations).length;

  const totalMatches = stats.totalMatches || 0;
  const goalsPerMatch = totalMatches > 0 ? (stats.totalGoals / totalMatches).toFixed(2) : '—';
  const avgGoals = totalTournaments > 0 ? Math.round(stats.totalGoals / totalTournaments) : 0;

  const overviewCards = [
    createStatCard('Mundiales', totalTournaments, 'text-accent'),
    createStatCard('Partidos', totalMatches, 'text-accent'),
    createStatCard('Goles totales', stats.totalGoals, 'text-accent'),
    createStatCard('Goles/Partido', goalsPerMatch, 'text-text-primary'),
    createStatCard('Goles/Mundial', avgGoals, 'text-text-primary'),
    createStatCard('Selecciones participantes', uniqueTeams, 'text-gold'),
  ];

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6',
      children: overviewCards,
    })
  );

  // Records
  const topEditionScorer = stats.topSingleEditionScorers?.[0] ?? null;
  const topMvp = stats.mvpRanking?.[0] ?? null;

  const records = [
    stats.maxGoalsTournament.edition >= 0 ? createRecordCard(
      'Mundial con más goles',
      String(stats.maxGoalsTournament.goals),
      stats.maxGoalsTournament.host.code,
      `${stats.maxGoalsTournament.host.name} ${getEditionYear(stats.maxGoalsTournament.edition)}`,
    ) : null,
    stats.minGoalsTournament ? createRecordCard(
      'Mundial con menos goles',
      String(stats.minGoalsTournament.goals),
      stats.minGoalsTournament.host.code,
      `${stats.minGoalsTournament.host.name} ${getEditionYear(stats.minGoalsTournament.edition)}`,
    ) : null,
    stats.mostGoalsTeam ? (() => {
      const host = simulateTournament(stats.mostGoalsTeam.edition).host;
      return createRecordCard(
        'Más goles de un equipo',
        String(stats.mostGoalsTeam.goals),
        stats.mostGoalsTeam.team.code,
        stats.mostGoalsTeam.team.name,
        `${host.name} ${getEditionYear(stats.mostGoalsTeam.edition)}`,
      );
    })() : null,
    stats.fewestGoalsTeam ? (() => {
      const host = simulateTournament(stats.fewestGoalsTeam.edition).host;
      return createRecordCard(
        'Menos goles de un equipo',
        String(stats.fewestGoalsTeam.goals),
        stats.fewestGoalsTeam.team.code,
        stats.fewestGoalsTeam.team.name,
        `${host.name} ${getEditionYear(stats.fewestGoalsTeam.edition)}`,
      );
    })() : null,
    topEditionScorer ? createRecordCard(
      'Más goles en un Mundial',
      String(topEditionScorer.goals),
      topEditionScorer.player.teamCode,
      topEditionScorer.player.name,
      getEditionYear(topEditionScorer.edition),
    ) : null,
    topMvp ? createRecordCard(
      'Más Balones de Oro',
      String(topMvp.count),
      topMvp.player.teamCode,
      topMvp.player.name,
    ) : null,
    stats.mostGoalsInMatch ? createRecordCard(
      'Más goles en un partido',
      String(stats.mostGoalsInMatch.goals),
      stats.mostGoalsInMatch.player.teamCode,
      stats.mostGoalsInMatch.player.name,
      getEditionYear(stats.mostGoalsInMatch.edition),
    ) : null,
    stats.mostEditionsPlayer ? createRecordCard(
      'Más ediciones jugadas',
      String(stats.mostEditionsPlayer.count),
      stats.mostEditionsPlayer.player.teamCode,
      stats.mostEditionsPlayer.player.name,
    ) : null,
  ].filter(Boolean);

  if (records.length > 0) {
    container.appendChild(
      el('div', {
        className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6',
        children: records,
      })
    );
  }

  // Rankings
  const titleEntries = toEntries(stats.titles);
  const partEntries = toEntries(stats.participations);

  const rankingCards = [
    titleEntries.length > 0 ? createRankingCard('M\u00e1s t\u00edtulos mundiales', titleEntries, true) : null,
    partEntries.length > 0 ? createRankingCard('M\u00e1s participaciones', partEntries, false) : null,
  ].filter(Boolean);

  if (rankingCards.length > 0) {
    container.appendChild(
      el('div', {
        className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6',
        children: rankingCards,
      })
    );
  }

  if (stats.allTimeRanking && stats.allTimeRanking.length > 0) {
    container.appendChild(createAllTimeRanking(stats.allTimeRanking, stats.liveTeamCodes, stats.rankingDeltas));
  }

  if (stats.biggestWins.length > 0) {
    container.appendChild(createMatchList('Mayores goleadas', stats.biggestWins.slice(0, 3)));
  }

  if (stats.highestScoring && stats.highestScoring.length > 0) {
    container.appendChild(createMatchList('Partidos con m\u00e1s goles', stats.highestScoring.slice(0, 3)));
  }

  // All-time top scorers (top 5, expandable to 50)
  if (stats.goalscorersRanking && stats.goalscorersRanking.length > 0) {
    container.appendChild(
      el('p', { text: 'Goleadores históricos', className: 'section-title mt-6' })
    );
    container.appendChild(createAllTimeScorers(stats.goalscorersRanking));
  }
}

function toEntries(map) {
  return Object.entries(map)
    .map(([code, count]) => ({ code, count, team: getTeamByCode(code) || TEAMS.find(t => t.code === code) }))
    .filter(e => e.team)
    .sort((a, b) => b.count - a.count);
}

function createRecordCard(label, value, teamCode, subtitle, subtitle2) {
  return el('div', {
    className: 'card p-4 flex flex-col items-center text-center gap-1',
    children: [
      el('div', { text: label, className: 'text-[9px] text-text-muted font-semibold uppercase tracking-wider' }),
      el('div', {
        className: 'flex items-center gap-2 mt-1',
        children: [
          flag(teamCode, 28),
          el('span', { text: value, className: 'text-3xl font-extrabold tabular-nums text-accent' }),
        ],
      }),
      el('div', { text: subtitle, className: 'text-xs font-medium text-text-primary' }),
      subtitle2 ? el('div', { text: subtitle2, className: 'text-[10px] text-text-muted' }) : null,
    ].filter(Boolean),
  });
}

function createStatCard(label, value, colorClass) {
  return el('div', {
    className: 'card p-4 text-center',
    children: [
      el('div', { text: String(value), className: `text-2xl font-extrabold tabular-nums ${colorClass}` }),
      el('div', { text: label, className: 'text-[11px] text-text-muted mt-1 font-medium' }),
    ],
  });
}

function createRankingCard(title, entries, isGold) {
  const topCount = entries[0]?.count || 1;
  const VISIBLE = 5;
  const hasMore = entries.length > VISIBLE;
  const expanded = expandedSections.has(title);

  function createRow(entry, i) {
    const isTop = i === 0;
    const barWidth = Math.max(8, (entry.count / topCount) * 100);
    const accentColor = isGold ? 'bg-gold' : 'bg-accent';
    const textColor = isGold ? 'text-gold' : 'text-accent';

    return el('div', {
      className: 'px-5 py-2.5 list-row',
      children: [
        el('div', {
          className: 'flex items-center justify-between mb-1',
          children: [
            el('div', {
              className: 'flex items-center gap-2.5',
              children: [
                el('span', {
                  text: `${i + 1}`,
                  className: `text-xs tabular-nums w-5 ${isTop ? `${textColor} font-bold` : 'text-text-muted'}`,
                }),
                flag(entry.team.code, 20),
                el('span', {
                  text: entry.team.name,
                  className: `text-sm ${isTop ? 'font-bold' : ''}`,
                }),
              ],
            }),
            el('span', {
              text: String(entry.count),
              className: `text-sm font-bold tabular-nums ${isTop ? textColor : 'text-text-secondary'}`,
            }),
          ],
        }),
        el('div', {
          className: 'h-1 bg-bg-surface rounded-full ml-7',
          children: [
            el('div', {
              className: `h-full rounded-full transition-all duration-700 ${isTop ? accentColor : 'bg-text-muted/30'}`,
              style: { width: `${barWidth}%` },
            }),
          ],
        }),
      ],
    });
  }

  const chevronDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="6,9 12,15 18,9"/></svg>';
  const chevronUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="18,15 12,9 6,15"/></svg>';

  const visible = expanded ? entries : entries.slice(0, VISIBLE);
  const listContainer = el('div', {
    className: 'py-2',
    children: visible.map((entry, i) => createRow(entry, i)),
  });

  const chevronEl = hasMore ? el('span', { html: expanded ? chevronUp : chevronDown, className: 'text-text-muted' }) : null;

  return el('div', {
    className: 'card overflow-hidden w-full',
    children: [
      el('div', {
        className: `px-5 py-3 border-b border-border-default flex items-center justify-between ${hasMore ? 'cursor-pointer' : ''}`,
        events: hasMore ? {
          click: () => {
            if (expandedSections.has(title)) expandedSections.delete(title);
            else expandedSections.add(title);
            const nowExpanded = expandedSections.has(title);
            listContainer.innerHTML = '';
            const vis = nowExpanded ? entries : entries.slice(0, VISIBLE);
            for (let i = 0; i < vis.length; i++) {
              listContainer.appendChild(createRow(vis[i], i));
            }
            chevronEl.innerHTML = nowExpanded ? chevronUp : chevronDown;
          },
        } : {},
        children: [
          el('h3', { text: title, className: 'text-sm font-bold' }),
          chevronEl,
        ].filter(Boolean),
      }),
      listContainer,
    ],
  });
}

function createAllTimeRanking(ranking, liveTeamCodes, rankingDeltas) {
  const SECTION_KEY = 'ranking-puntos';
  const VISIBLE = 5;
  const hasMore = ranking.length > VISIBLE;
  const expanded = expandedSections.has(SECTION_KEY);

  const chevronDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="6,9 12,15 18,9"/></svg>';
  const chevronUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><polyline points="18,15 12,9 6,15"/></svg>';

  const cols = ['EJ', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'];

  function createHeader() {
    return el('div', {
      className: 'flex items-center gap-1 px-4 py-2 border-b border-border-subtle',
      children: [
        el('span', { className: 'w-5 shrink-0' }),
        el('span', { className: 'w-5 shrink-0' }),
        el('div', { className: 'flex-1 min-w-0' }),
        ...cols.map(c =>
          el('span', {
            text: c,
            className: `text-[8px] text-text-muted font-semibold tabular-nums text-center ${c === 'Pts' ? 'w-7' : c === 'DG' ? 'w-6' : 'w-5'} shrink-0`,
          })
        ),
      ],
    });
  }

  function createDeltaIndicator(delta) {
    if (delta > 0) {
      return el('span', {
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-2.5 h-2.5"><polyline points="6,15 12,9 18,15"/></svg>',
        className: 'text-emerald-500 shrink-0 w-3',
      });
    } else if (delta < 0) {
      return el('span', {
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-2.5 h-2.5"><polyline points="6,9 12,15 18,9"/></svg>',
        className: 'text-live shrink-0 w-3',
      });
    }
    return el('span', {
      text: '–',
      className: 'text-[9px] text-text-muted shrink-0 w-3 text-center',
    });
  }

  function createRow(r, i) {
    const isTop = i < 3;
    const isLive = liveTeamCodes && liveTeamCodes.has(r.team.code);
    const delta = rankingDeltas ? rankingDeltas.get(r.team.code) : undefined;
    const statClass = 'text-[10px] tabular-nums text-center shrink-0 text-text-secondary';
    return el('div', {
      className: `flex items-center gap-1 px-4 py-2 list-row${isLive ? ' bg-yellow-500/10' : ''}`,
      children: [
        el('span', { text: `${i + 1}`, className: `text-[10px] tabular-nums w-5 shrink-0 ${isTop ? 'text-accent font-bold' : 'text-text-muted'}` }),
        flag(r.team.code, 18),
        el('span', {
          text: r.team.name,
          className: `text-xs truncate flex-1 min-w-0 ${isTop ? 'font-medium' : ''}`,
        }),
        ...(isLive && delta !== undefined ? [createDeltaIndicator(delta)] : []),
        el('span', { text: String(r.editions), className: `${statClass} w-5` }),
        el('span', { text: String(r.played), className: `${statClass} w-5` }),
        el('span', { text: String(r.won), className: `${statClass} w-5` }),
        el('span', { text: String(r.drawn), className: `${statClass} w-5` }),
        el('span', { text: String(r.lost), className: `${statClass} w-5` }),
        el('span', { text: String(r.gf), className: `${statClass} w-5` }),
        el('span', { text: String(r.ga), className: `${statClass} w-5` }),
        el('span', {
          text: r.gd > 0 ? `+${r.gd}` : String(r.gd),
          className: `text-[10px] tabular-nums text-center w-6 shrink-0 ${
            r.gd > 0 ? 'text-accent font-semibold' : r.gd < 0 ? 'text-live' : 'text-text-muted'
          }`,
        }),
        el('span', {
          text: String(r.points),
          className: `text-xs font-bold tabular-nums text-center w-7 shrink-0 ${isTop ? 'text-accent' : 'text-text-secondary'}`,
        }),
      ],
    });
  }

  const visible = expanded ? ranking : ranking.slice(0, VISIBLE);
  const listContainer = el('div', {
    children: [
      createHeader(),
      ...visible.map((r, i) => createRow(r, i)),
    ],
  });

  const chevronEl = hasMore ? el('span', { html: expanded ? chevronUp : chevronDown, className: 'text-text-muted' }) : null;

  return el('div', {
    className: 'mb-6',
    children: [
      el('div', {
        className: 'card overflow-hidden w-full',
        children: [
          el('div', {
            className: `px-5 py-3 border-b border-border-default flex items-center justify-between ${hasMore ? 'cursor-pointer' : ''}`,
            events: hasMore ? {
              click: () => {
                if (expandedSections.has(SECTION_KEY)) expandedSections.delete(SECTION_KEY);
                else expandedSections.add(SECTION_KEY);
                const nowExpanded = expandedSections.has(SECTION_KEY);
                listContainer.innerHTML = '';
                listContainer.appendChild(createHeader());
                const vis = nowExpanded ? ranking : ranking.slice(0, VISIBLE);
                for (let i = 0; i < vis.length; i++) {
                  listContainer.appendChild(createRow(vis[i], i));
                }
                chevronEl.innerHTML = nowExpanded ? chevronUp : chevronDown;
              },
            } : {},
            children: [
              el('h3', { text: 'Ranking por puntos', className: 'text-sm font-bold' }),
              chevronEl,
            ].filter(Boolean),
          }),
          listContainer,
        ],
      }),
    ],
  });
}

function createMatchDetail(m) {
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
          el('div', { className: 'absolute inset-x-0 top-[5px] h-[1.5px] bg-bg-surface rounded-full' }),
          el('div', { className: 'absolute left-0 top-[5px] h-[1.5px] bg-text-muted/20 w-full rounded-full' }),
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

function createMatchList(title, wins) {
  return el('div', {
    className: 'mt-6',
    children: [
      el('p', { text: title, className: 'section-title' }),
      el('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 gap-2',
        children: wins.map((win) => {
          const tournament = simulateTournament(win.edition);
          const editionLabel = `${tournament.host.name} ${getEditionYear(win.edition)}`;
          const key = `${win.edition}-${win.matchId}`;
          const isExpanded = expandedMatchIds.has(key);

          const detailEl = createMatchDetail(win);
          detailEl.style.display = isExpanded ? 'block' : 'none';

          const card = el('div', {
            className: 'card p-3 cursor-pointer select-none',
            children: [
              el('div', {
                className: 'flex items-center gap-2',
                children: [
                  el('div', {
                    className: 'flex items-center gap-1.5 flex-1 min-w-0',
                    children: [
                      flag(win.teamA.code, 20),
                      el('span', { text: win.teamA.name, className: `text-xs truncate ${win.goalsA > win.goalsB ? 'font-bold' : ''}` }),
                    ],
                  }),
                  el('div', {
                    className: 'flex items-center gap-1 shrink-0',
                    children: [
                      el('span', {
                        text: `${win.goalsA}`,
                        className: `score-num text-xs !min-w-[26px] !h-[26px] ${win.goalsA > win.goalsB ? 'score-num-winner' : ''}`,
                      }),
                      el('span', { text: '-', className: 'text-text-muted text-[10px]' }),
                      el('span', {
                        text: `${win.goalsB}`,
                        className: `score-num text-xs !min-w-[26px] !h-[26px] ${win.goalsB > win.goalsA ? 'score-num-winner' : ''}`,
                      }),
                    ],
                  }),
                  el('div', {
                    className: 'flex items-center gap-1.5 flex-1 min-w-0 justify-end',
                    children: [
                      el('span', { text: win.teamB.name, className: `text-xs truncate ${win.goalsB > win.goalsA ? 'font-bold' : ''}` }),
                      flag(win.teamB.code, 20),
                    ],
                  }),
                ],
              }),
              el('div', {
                className: 'text-[10px] text-text-muted text-center mt-1.5',
                text: editionLabel,
              }),
              detailEl,
            ],
          });

          card.addEventListener('click', () => {
            if (expandedMatchIds.has(key)) {
              expandedMatchIds.delete(key);
              detailEl.style.display = 'none';
            } else {
              expandedMatchIds.add(key);
              detailEl.style.display = 'block';
            }
          });

          return card;
        }),
      }),
    ],
  });
}

/**
 * Top scorers in a single edition (player records).
 */
function createPlayerEditionScorers(entries) {
  return el('div', {
    className: 'card overflow-hidden mb-6',
    children: [
      el('div', {
        className: 'flex items-center gap-1 px-4 py-2 border-b border-border-subtle text-[9px] font-bold uppercase tracking-wider text-text-muted',
        children: [
          el('span', { className: 'w-6 shrink-0' }),
          el('span', { className: 'w-5 shrink-0' }),
          el('span', { text: 'Jugador', className: 'flex-1' }),
          el('span', { text: 'Selección', className: 'w-24 shrink-0 hidden sm:block' }),
          el('span', { text: 'Edición', className: 'w-24 shrink-0 hidden md:block' }),
          el('span', { text: 'Goles', className: 'w-12 text-right shrink-0' }),
        ],
      }),
      ...entries.map((entry, i) => {
        const year = getEditionYear(entry.edition);
        return el('div', {
          className: 'flex items-center gap-1 px-4 py-2 list-row',
          children: [
            el('span', { text: `${i + 1}`, className: `w-6 shrink-0 text-[10px] tabular-nums ${i < 3 ? 'text-accent font-bold' : 'text-text-muted'}` }),
            flag(entry.player.teamCode, 18),
            el('span', { text: entry.player.name, className: 'flex-1 min-w-0 text-xs truncate font-medium' }),
            el('span', { text: entry.host ? entry.host.name : '', className: 'w-24 shrink-0 text-xs text-text-muted truncate hidden sm:block' }),
            el('span', { text: `${year}`, className: 'w-24 shrink-0 text-xs text-text-muted hidden md:block' }),
            el('span', { text: String(entry.goals), className: 'w-12 text-right shrink-0 text-accent font-bold tabular-nums text-sm' }),
          ],
        });
      }),
    ],
  });
}

/**
 * Players with most MVP awards (Balón de Oro).
 */
function createMvpRanking(entries) {
  return el('div', {
    className: 'card overflow-hidden mb-6',
    children: [
      el('div', {
        className: 'flex items-center gap-1 px-4 py-2 border-b border-border-subtle text-[9px] font-bold uppercase tracking-wider text-text-muted',
        children: [
          el('span', { className: 'w-6 shrink-0' }),
          el('span', { className: 'w-5 shrink-0' }),
          el('span', { text: 'Jugador', className: 'flex-1' }),
          el('span', { text: 'Selección', className: 'w-28 shrink-0 hidden sm:block' }),
          el('span', { text: 'Veces', className: 'w-12 text-right shrink-0' }),
        ],
      }),
      ...entries.map((entry, i) =>
        el('div', {
          className: 'flex items-center gap-1 px-4 py-2 list-row',
          children: [
            el('span', { text: `${i + 1}`, className: `w-6 shrink-0 text-[10px] tabular-nums ${i < 3 ? 'text-accent font-bold' : 'text-text-muted'}` }),
            flag(entry.player.teamCode, 18),
            el('div', {
              className: 'flex-1 min-w-0',
              children: [
                el('div', { text: entry.player.name, className: 'text-xs font-medium truncate' }),
                el('div', { text: `Ediciones: ${entry.editions.map(getEditionYear).join(', ')}`, className: 'text-[9px] text-text-muted truncate' }),
              ],
            }),
            el('span', { text: entry.player.teamCode.toUpperCase(), className: 'w-28 shrink-0 text-xs text-text-muted truncate hidden sm:block' }),
            el('span', {
              className: 'w-12 text-right shrink-0 flex items-center justify-end gap-1',
              children: [
                el('span', { text: '\u2b50', className: 'text-[11px]' }),
                el('span', { text: String(entry.count), className: 'text-accent font-bold tabular-nums text-sm' }),
              ],
            }),
          ],
        })
      ),
    ],
  });
}

/**
 * All-time historical top scorers (top 5 default, expandable to 50).
 */
function createAllTimeScorers(allEntries) {
  const VISIBLE = 5;
  const MAX = Math.min(50, allEntries.length);
  const SECTION_KEY = 'goalscorers-all-time';
  const expanded = expandedSections.has(SECTION_KEY);

  const entries = expanded ? allEntries.slice(0, MAX) : allEntries.slice(0, VISIBLE);
  const hasMore = allEntries.length > VISIBLE;

  const chevronDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>';
  const chevronUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"/></svg>';

  function createRow(entry, i) {
    const topN = entry.totalGoals;
    return el('div', {
      className: 'flex items-center gap-1 px-4 py-2 list-row',
      children: [
        el('span', { text: `${i + 1}`, className: `w-6 shrink-0 text-[10px] tabular-nums ${i < 3 ? 'text-accent font-bold' : 'text-text-muted'}` }),
        flag(entry.player.teamCode, 32),
        el('div', {
          className: 'flex-1 min-w-0 ml-1',
          children: [
            el('div', { text: entry.player.name, className: 'text-xs font-medium truncate' }),
            el('div', {
              text: `${entry.editions.length} mundial${entry.editions.length !== 1 ? 'es' : ''}`,
              className: 'text-[9px] text-text-muted',
            }),
          ],
        }),
        el('span', { text: String(topN), className: 'w-12 text-right shrink-0 text-accent font-bold tabular-nums text-sm' }),
      ],
    });
  }

  const rowsContainer = el('div', { children: entries.map((e, i) => createRow(e, i)) });

  const chevronEl = hasMore ? el('span', {
    html: expanded ? chevronUp : chevronDown,
    className: 'text-text-muted w-4 h-4',
  }) : null;

  return el('div', {
    className: 'card overflow-hidden mb-6',
    children: [
      // Header row
      el('div', {
        className: `px-4 py-2.5 border-b border-border-default flex items-center justify-between ${hasMore ? 'cursor-pointer' : ''}`,
        events: hasMore ? {
          click: () => {
            const nowExpanded = !expandedSections.has(SECTION_KEY);
            if (nowExpanded) expandedSections.add(SECTION_KEY);
            else expandedSections.delete(SECTION_KEY);
            const vis = nowExpanded ? allEntries.slice(0, MAX) : allEntries.slice(0, VISIBLE);
            rowsContainer.innerHTML = '';
            vis.forEach((e, i) => rowsContainer.appendChild(createRow(e, i)));
            if (chevronEl) chevronEl.innerHTML = nowExpanded ? chevronUp : chevronDown;
          },
        } : {},
        children: [
          el('div', {
            className: 'flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-text-muted',
            children: [
              el('span', { className: 'w-6 shrink-0' }),
              el('span', { className: 'w-5 shrink-0' }),
              el('span', { text: 'Jugador', className: 'flex-1' }),
              el('span', { text: 'Goles totales', className: 'w-24 text-right shrink-0' }),
            ],
          }),
          chevronEl,
        ].filter(Boolean),
      }),
      rowsContainer,
      null,
    ].filter(Boolean),
  });
}
