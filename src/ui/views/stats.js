import { el, flag, getEditionYear } from '../components.js';
import { getLiveStats } from '../../engine/simulation.js';
import { simulateTournament } from '../../engine/tournament.js';
import { getTeamByCode, TEAMS } from '../../engine/teams.js';

// Persists expanded state across re-renders during live updates
const expandedSections = new Set();

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
  const avgGoals = totalTournaments > 0 ? Math.round(stats.totalGoals / totalTournaments) : 0;

  const overviewCards = [
    createStatCard('Mundiales', totalTournaments, 'text-accent'),
    createStatCard('Goles totales', stats.totalGoals, 'text-accent'),
    createStatCard('Goles/Mundial', avgGoals, 'text-text-primary'),
    createStatCard('Selecciones', uniqueTeams, 'text-gold'),
  ];

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6',
      children: overviewCards,
    })
  );

  // Records
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
        'Más goles en un mundial',
        String(stats.mostGoalsTeam.goals),
        stats.mostGoalsTeam.team.code,
        stats.mostGoalsTeam.team.name,
        `${host.name} ${getEditionYear(stats.mostGoalsTeam.edition)}`,
      );
    })() : null,
    stats.fewestGoalsTeam ? (() => {
      const host = simulateTournament(stats.fewestGoalsTeam.edition).host;
      return createRecordCard(
        'Menos goles en un mundial',
        String(stats.fewestGoalsTeam.goals),
        stats.fewestGoalsTeam.team.code,
        stats.fewestGoalsTeam.team.name,
        `${host.name} ${getEditionYear(stats.fewestGoalsTeam.edition)}`,
      );
    })() : null,
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
    container.appendChild(createMatchList('Mayores goleadas', stats.biggestWins.slice(0, 10)));
  }

  if (stats.highestScoring && stats.highestScoring.length > 0) {
    container.appendChild(createMatchList('Partidos con m\u00e1s goles', stats.highestScoring.slice(0, 3)));
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

          return el('div', {
            className: 'card p-3',
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
            ],
          });
        }),
      }),
    ],
  });
}
