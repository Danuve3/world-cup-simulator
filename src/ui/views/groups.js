import { el, flag } from '../components.js';
import { getGroupMatchTiming } from '../../engine/timeline.js';
import { computeStandings } from '../../engine/group-stage.js';

/**
 * Groups view — 8 group tables with anti-spoiler protection.
 */
export function renderGroups(container, state) {
  container.innerHTML = '';

  const { tournament, cycleMinute } = state;
  const { matches } = tournament.groupStage;

  // Filter to only completed matches (anti-spoiler)
  const completedMatches = matches.filter(m => {
    const timing = getGroupMatchTiming(m.matchday, m.group, m.matchIndex);
    return timing.endMin <= cycleMinute;
  });

  // Recompute standings from completed matches only
  const standings = computeStandings(tournament.draw.groups, completedMatches);

  const totalGoals = completedMatches.reduce((s, m) => s + m.goalsA + m.goalsB, 0);

  container.appendChild(
    el('div', {
      className: 'flex items-center justify-between mb-5 flex-wrap gap-2',
      children: [
        el('h2', { text: 'Fase de Grupos', className: 'text-lg md:text-xl font-bold' }),
        el('div', {
          className: 'flex gap-2',
          children: [
            el('span', { className: 'pill', text: `${completedMatches.length} partidos` }),
            el('span', { className: 'pill', text: `${totalGoals} goles` }),
          ],
        }),
      ],
    })
  );

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4',
      children: standings.map((table, g) => createGroupCardWithMatches(table, g, completedMatches)),
    })
  );
}

function createGroupCardWithMatches(table, groupIndex, completedMatches) {
  const letter = String.fromCharCode(65 + groupIndex);
  const groupMatches = completedMatches.filter(m => m.group === groupIndex);
  const allPlayed = table.every(r => r.played === 3);

  // Group matches by matchday
  const byMatchday = [[], [], []];
  for (const m of groupMatches) byMatchday[m.matchday].push(m);

  return el('div', {
    className: 'card p-4',
    children: [
      el('div', {
        className: 'text-xs font-bold text-text-muted mb-3 uppercase tracking-wider',
        text: `Grupo ${letter}`,
      }),
      // Header row
      createStandingsHeader(),
      // Team rows
      ...table.map((row, i) => createStandingsRow(row, i, allPlayed)),
      // Matches by matchday below the standings
      ...(groupMatches.length > 0 ? [
        el('div', {
          className: 'border-t border-border-subtle mt-3 pt-3 space-y-2',
          children: byMatchday.flatMap((dayMatches, day) =>
            dayMatches.length > 0
              ? [
                  el('div', {
                    className: 'text-[9px] text-text-muted uppercase tracking-wider font-semibold mt-1',
                    text: `Jornada ${day + 1}`,
                  }),
                  ...dayMatches.map(m => createInlineMatchResult(m)),
                ]
              : []
          ),
        }),
      ] : []),
    ],
  });
}

function createStandingsHeader() {
  const cols = ['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'];
  return el('div', {
    className: 'flex items-center gap-1 pb-1.5 mb-1 border-b border-border-subtle',
    children: [
      el('div', { className: 'w-[3px]' }),
      el('span', { className: 'w-4 shrink-0' }),
      el('span', { className: 'w-5 shrink-0' }), // flag placeholder
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

function createStandingsRow(row, i, allPlayed) {
  const qualified = i < 2 && allPlayed;
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

function createInlineMatchResult(m) {
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
