import { el, flag } from '../components.js';
import { getStats } from '../../engine/simulation.js';
import { getTeamByCode, TEAMS } from '../../engine/teams.js';

/**
 * Stats view — Rankings and records.
 */
export function renderStats(container, state) {
  container.innerHTML = '';

  container.appendChild(
    el('h2', { text: 'Estad\u00edsticas', className: 'text-lg md:text-xl font-bold mb-5' })
  );

  const stats = getStats(state.timestamp);

  if (stats.totalTournaments === 0) {
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
  container.appendChild(
    el('div', {
      className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6',
      children: [
        createStatCard('Mundiales', stats.totalTournaments, 'text-accent'),
        createStatCard('Goles Totales', stats.totalGoals, 'text-accent'),
        createStatCard('Prom/Mundial', Math.round(stats.totalGoals / stats.totalTournaments), 'text-text-primary'),
        createStatCard('Max Goles/Cup', stats.maxGoalsTournament.goals, 'text-gold'),
      ],
    })
  );

  // Rankings
  const titleEntries = toEntries(stats.titles).slice(0, 15);
  const partEntries = toEntries(stats.participations).slice(0, 15);

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6',
      children: [
        titleEntries.length > 0 ? createRankingCard('T\u00edtulos Mundiales', titleEntries, true) : null,
        partEntries.length > 0 ? createRankingCard('M\u00e1s Participaciones', partEntries, false) : null,
      ].filter(Boolean),
    })
  );

  if (stats.biggestWins.length > 0) {
    container.appendChild(createBiggestWins(stats.biggestWins.slice(0, 10)));
  }
}

function toEntries(map) {
  return Object.entries(map)
    .map(([code, count]) => ({ code, count, team: getTeamByCode(code) || TEAMS.find(t => t.code === code) }))
    .filter(e => e.team)
    .sort((a, b) => b.count - a.count);
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

  return el('div', {
    className: 'card overflow-hidden',
    children: [
      el('div', {
        className: 'px-5 py-3 border-b border-border-default',
        children: [el('h3', { text: title, className: 'text-sm font-bold' })],
      }),
      el('div', {
        children: entries.map((entry, i) => {
          const isTop = i === 0;
          const barWidth = Math.max(8, (entry.count / topCount) * 100);
          const accentColor = isGold ? 'bg-gold' : 'bg-accent';
          const textColor = isGold ? 'text-gold' : 'text-accent';

          return el('div', {
            className: 'px-5 py-2.5 table-row',
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
        }),
      }),
    ],
  });
}

function createBiggestWins(wins) {
  return el('div', {
    children: [
      el('p', { text: 'Mayores Goleadas', className: 'section-title' }),
      el('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 gap-2',
        children: wins.map((win, i) =>
          el('div', {
            className: 'card p-3 flex items-center gap-3',
            children: [
              el('span', { text: `${i + 1}`, className: 'text-xs text-text-muted w-5 shrink-0 tabular-nums' }),
              el('div', {
                className: 'flex items-center gap-2 flex-1 min-w-0',
                children: [
                  flag(win.teamA.code, 20),
                  el('span', { text: win.teamA.name, className: 'text-xs truncate' }),
                  el('div', {
                    className: 'flex items-center gap-1 shrink-0 mx-1',
                    children: [
                      el('span', {
                        text: `${win.goalsA}`,
                        className: `score-num text-xs !min-w-[24px] !h-[24px] ${win.goalsA > win.goalsB ? 'score-num-winner' : ''}`,
                      }),
                      el('span', { text: '-', className: 'text-[9px] text-text-muted' }),
                      el('span', {
                        text: `${win.goalsB}`,
                        className: `score-num text-xs !min-w-[24px] !h-[24px] ${win.goalsB > win.goalsA ? 'score-num-winner' : ''}`,
                      }),
                    ],
                  }),
                  el('span', { text: win.teamB.name, className: 'text-xs truncate' }),
                  flag(win.teamB.code, 20),
                ],
              }),
              el('span', { text: `Ed. ${win.edition + 1}`, className: 'text-[9px] text-text-muted shrink-0' }),
            ],
          })
        ),
      }),
    ],
  });
}
