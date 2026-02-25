import { el, flag, createPenaltyDisplay } from '../components.js';
import { getGroupMatchTiming } from '../../engine/timeline.js';
import { computeStandings } from '../../engine/group-stage.js';
import { SCHEDULE, DRAW_COUNTDOWN_MS, DRAW_DISPLAY_MS } from '../../constants.js';

// Persistent expanded state across re-renders (survives live-match ticks)
const expandedMatchIds = new Set();

/**
 * Groups view — 8 group tables with anti-spoiler protection and live data.
 */
export function renderGroups(container, state) {
  container.innerHTML = '';

  const { tournament, cycleMinute, cycleMinuteExact, liveMatches } = state;

  // Show "sorteo en curso" until all teams are revealed (not just until DRAW phase ends)
  const drawDoneMs = tournament.draw.drawSequence.length * (DRAW_COUNTDOWN_MS + DRAW_DISPLAY_MS);
  const drawDone = cycleMinute * 60 * 1000 >= drawDoneMs;
  if (!drawDone) {
    container.appendChild(
      el('h2', { text: 'Fase de Grupos', className: 'text-lg md:text-xl font-bold mb-5' })
    );
    container.appendChild(
      el('div', {
        className: 'card p-12 text-center',
        children: [
          el('div', { text: '\ud83c\udfb1', className: 'text-4xl mb-3' }),
          el('p', { text: 'Sorteo en curso', className: 'text-sm text-text-secondary' }),
          el('p', { text: 'Los grupos se revelar\u00e1n al finalizar el sorteo', className: 'text-xs text-text-muted mt-1' }),
        ],
      })
    );
    return;
  }

  const { matches } = tournament.groupStage;

  // Filter to only completed matches (anti-spoiler)
  const completedMatches = matches.filter(m => {
    const timing = getGroupMatchTiming(m.matchday, m.group, m.matchIndex);
    return timing.endMin <= cycleMinuteExact;
  });

  // Live group matches (in progress right now)
  const liveGroupMatches = (liveMatches || []).filter(m => m.type === 'group' && m.teamA && m.teamB);

  // Collect live team codes for highlighting
  const liveTeamCodes = new Set();
  for (const m of liveGroupMatches) {
    liveTeamCodes.add(m.teamA.code);
    liveTeamCodes.add(m.teamB.code);
  }

  // Recompute standings from completed + live matches
  const standings = computeStandings(tournament.draw.groups, [...completedMatches, ...liveGroupMatches]);

  // Compute position deltas: compare live standings vs completed-only standings
  const positionDeltas = new Map();
  if (liveGroupMatches.length > 0) {
    const baseStandings = computeStandings(tournament.draw.groups, completedMatches);
    for (let g = 0; g < standings.length; g++) {
      const baseTable = baseStandings[g];
      const liveTable = standings[g];
      for (let pos = 0; pos < liveTable.length; pos++) {
        const code = liveTable[pos].team.code;
        if (liveTeamCodes.has(code)) {
          const basePos = baseTable.findIndex(r => r.team.code === code);
          positionDeltas.set(code, basePos - pos); // positive = moved up
        }
      }
    }
  }

  const liveCount = liveGroupMatches.length;

  // Determine current matchday (1-indexed) from activity
  const matchdaysActive = new Set();
  for (const m of completedMatches) matchdaysActive.add(m.matchday);
  for (const m of liveGroupMatches) matchdaysActive.add(m.matchday);
  const currentMatchday = matchdaysActive.size > 0 ? Math.max(...matchdaysActive) + 1 : 0;
  // Check if all 3 matchdays are fully completed (16 matches each = 48 total)
  const allGroupsDone = completedMatches.length >= 48;

  container.appendChild(
    el('div', {
      className: 'flex items-center justify-between mb-5 flex-wrap gap-2',
      children: [
        el('h2', { text: 'Fase de Grupos', className: 'text-lg md:text-xl font-bold' }),
        el('div', {
          className: 'flex gap-2',
          children: [
            ...(allGroupsDone
              ? [el('span', { className: 'pill', text: 'Completada' })]
              : currentMatchday > 0
                ? [el('span', { className: 'pill', text: `Jornada ${currentMatchday} de 3` })]
                : []),
            ...(liveCount > 0 ? [el('span', { className: 'pill pill-live', text: `${liveCount} en vivo` })] : []),
          ],
        }),
      ],
    })
  );

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4',
      children: standings.map((table, g) => createGroupCardWithMatches(table, g, matches, completedMatches, liveGroupMatches, liveTeamCodes, positionDeltas, state.cycleStart)),
    })
  );
}

function createGroupCardWithMatches(table, groupIndex, allMatches, completedMatches, liveGroupMatches, liveTeamCodes, positionDeltas, cycleStart) {
  const letter = String.fromCharCode(65 + groupIndex);
  const groupCompleted = completedMatches.filter(m => m.group === groupIndex);
  const groupLive = liveGroupMatches.filter(m => m.group === groupIndex);
  const allPlayed = table.every(r => r.played === 3);

  const completedIds = new Set(groupCompleted.map(m => m.matchId));
  const liveMap = new Map(groupLive.map(m => [m.matchId, m]));

  const groupMatches = allMatches
    .filter(m => m.group === groupIndex)
    .sort((a, b) => a.matchday - b.matchday || a.matchIndex - b.matchIndex);

  return el('div', {
    className: 'card p-4',
    children: [
      el('div', {
        className: 'flex items-center justify-between mb-3',
        children: [
          el('span', {
            className: 'text-xs font-bold text-text-muted uppercase tracking-wider',
            text: `Grupo ${letter}`,
          }),
          ...(groupLive.length > 0 ? [
            el('span', {
              className: 'text-[9px] font-bold text-live uppercase tracking-wider animate-pulse',
              text: 'EN VIVO',
            }),
          ] : []),
        ],
      }),
      // Header row
      createStandingsHeader(),
      // Team rows
      ...table.map((row, i) => createStandingsRow(row, i, allPlayed, liveTeamCodes, positionDeltas)),
      // All 6 matches grouped by matchday
      el('div', {
        className: 'border-t border-border-subtle mt-3 pt-3 space-y-2',
        children: [0, 1, 2].flatMap(day => [
          el('div', {
            className: 'text-[9px] text-text-muted uppercase tracking-wider font-semibold mt-1',
            text: `Jornada ${day + 1}`,
          }),
          ...groupMatches
            .filter(m => m.matchday === day)
            .map(m => {
              if (liveMap.has(m.matchId)) return createInlineMatchResult(liveMap.get(m.matchId), true);
              if (completedIds.has(m.matchId)) return createInlineMatchResult(m, false);
              return createInlineMatchUpcoming(m, cycleStart);
            }),
        ]),
      }),
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

function createStandingsRow(row, i, allPlayed, liveTeamCodes, positionDeltas) {
  const qualified = i < 2 && allPlayed;
  const isLive = liveTeamCodes && liveTeamCodes.has(row.team.code);
  const delta = positionDeltas ? positionDeltas.get(row.team.code) : undefined;
  const statClass = 'text-[10px] tabular-nums text-center shrink-0 text-text-secondary';
  return el('div', {
    className: `flex items-center gap-1 py-1.5${isLive ? ' bg-yellow-500/10 -mx-1 px-1 rounded' : ''}`,
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
      ...(isLive && delta !== undefined ? [createDeltaIndicator(delta)] : []),
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

function createInlineMatchUpcoming(m, cycleStart) {
  const timing = getGroupMatchTiming(m.matchday, m.group, m.matchIndex);
  const startMs = cycleStart + timing.startMin * 60 * 1000;
  const d = new Date(startMs);
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}h`;

  return el('div', {
    className: 'flex items-center gap-1.5 text-[11px]',
    children: [
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0 justify-end',
        children: [
          el('span', { text: m.teamA.name, className: 'truncate text-text-secondary' }),
          flag(m.teamA.code, 14),
        ],
      }),
      el('span', {
        text: dateStr,
        className: 'text-[9px] tabular-nums shrink-0 text-text-muted bg-bg-surface rounded px-1.5 py-0.5 whitespace-nowrap',
      }),
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0',
        children: [
          flag(m.teamB.code, 14),
          el('span', { text: m.teamB.name, className: 'truncate text-text-secondary' }),
        ],
      }),
    ],
  });
}

function createInlineMatchResult(m, isLive) {
  const aWon = m.goalsA > m.goalsB;
  const bWon = m.goalsB > m.goalsA;

  const row = el('div', {
    className: `flex items-center gap-1.5 text-[11px]${isLive ? ' bg-yellow-500/10 -mx-1 px-1 rounded py-0.5' : ' cursor-pointer'}`,
    children: [
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0 justify-end',
        children: [
          el('span', { text: m.teamA.name, className: `truncate ${isLive ? 'font-semibold' : aWon ? 'font-semibold' : 'text-text-secondary'}` }),
          flag(m.teamA.code, 14),
        ],
      }),
      isLive
        ? el('div', {
            className: 'flex items-center gap-1 shrink-0',
            children: [
              el('span', {
                text: `${m.goalsA} - ${m.goalsB}`,
                className: 'font-bold tabular-nums text-[10px] text-live',
              }),
              el('span', {
                text: `${m.matchMinute}'`,
                className: 'text-[9px] text-live font-semibold tabular-nums animate-pulse',
              }),
            ],
          })
        : el('span', {
            text: `${m.goalsA} - ${m.goalsB}`,
            className: 'font-bold tabular-nums shrink-0 text-[10px] bg-bg-surface rounded px-1.5 py-0.5',
          }),
      el('div', {
        className: 'flex items-center gap-1 flex-1 min-w-0',
        children: [
          flag(m.teamB.code, 14),
          el('span', { text: m.teamB.name, className: `truncate ${isLive ? 'font-semibold' : bWon ? 'font-semibold' : 'text-text-secondary'}` }),
        ],
      }),
    ],
  });

  if (isLive) return row;

  // Completed: wrap with clickable toggle for goal detail
  const detailEl = createGroupMatchDetail(m);
  const isExpanded = expandedMatchIds.has(m.matchId);
  detailEl.style.display = isExpanded ? 'block' : 'none';
  row.addEventListener('click', () => {
    if (expandedMatchIds.has(m.matchId)) {
      expandedMatchIds.delete(m.matchId);
      detailEl.style.display = 'none';
    } else {
      expandedMatchIds.add(m.matchId);
      detailEl.style.display = 'block';
    }
  });
  return el('div', { children: [row, detailEl] });
}

function createGroupMatchDetail(m) {
  const events = m.events || [];
  const maxMinute = m.extraTime ? 120 : 90;
  const pct = min => `${Math.min(100, (min / maxMinute) * 100).toFixed(1)}%`;
  const goalsA = events.filter(e => e.team === 'A');
  const goalsB = events.filter(e => e.team === 'B');

  return el('div', {
    className: 'pt-1.5 pb-0.5',
    children: [
      events.length === 0
        ? el('p', { text: 'Sin goles', className: 'text-[10px] text-text-muted text-center' })
        : el('div', {
            className: 'flex gap-2 mb-1',
            children: [
              el('div', { className: 'flex-1 flex flex-col gap-0.5 min-w-0', children: goalsA.map(e => el('div', { text: e.scorerName ? `⚽ ${e.minute}' ${e.scorerName}` : `⚽ ${e.minute}'`, className: 'text-[10px] text-accent font-medium truncate' })) }),
              el('div', { className: 'shrink-0 w-8' }),
              el('div', { className: 'flex-1 flex flex-col gap-0.5 items-end min-w-0', children: goalsB.map(e => el('div', { text: e.scorerName ? `${e.scorerName} ${e.minute}' ⚽` : `⚽ ${e.minute}'`, className: 'text-[10px] text-live font-medium truncate' })) }),
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
