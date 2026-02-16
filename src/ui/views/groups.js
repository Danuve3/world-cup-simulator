import { el, flag } from '../components.js';

/**
 * Groups view — 8 group tables.
 */
export function renderGroups(container, state) {
  container.innerHTML = '';

  const { tournament } = state;
  const { standings, matches } = tournament.groupStage;

  container.appendChild(
    el('div', {
      className: 'flex items-center justify-between mb-5 flex-wrap gap-2',
      children: [
        el('h2', { text: 'Fase de Grupos', className: 'text-lg md:text-xl font-bold' }),
        el('div', {
          className: 'flex gap-2',
          children: [
            el('span', { className: 'pill', text: `${matches.length} partidos` }),
            el('span', {
              className: 'pill',
              text: `${matches.reduce((s, m) => s + m.goalsA + m.goalsB, 0)} goles`,
            }),
          ],
        }),
      ],
    })
  );

  container.appendChild(
    el('div', {
      className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8',
      children: standings.map((table, g) => createGroupCard(table, g)),
    })
  );

  container.appendChild(createMatchResults(matches));
}

function createGroupCard(table, groupIndex) {
  const letter = String.fromCharCode(65 + groupIndex);

  return el('div', {
    className: 'card p-4',
    children: [
      el('div', {
        className: 'text-xs font-bold text-text-muted mb-3 uppercase tracking-wider',
        text: `Grupo ${letter}`,
      }),
      ...table.map((row, i) => {
        const qualified = i < 2;
        return el('div', {
          className: 'flex items-center justify-between py-2',
          children: [
            el('div', {
              className: 'flex items-center gap-2 min-w-0',
              children: [
                qualified
                  ? el('span', { className: 'qualified-bar' })
                  : el('span', { className: 'w-[3px]' }),
                el('span', { text: `${i + 1}`, className: 'text-xs text-text-muted w-4 shrink-0 tabular-nums' }),
                flag(row.team.code, 20),
                el('span', {
                  text: row.team.name,
                  className: `text-sm truncate ${qualified ? 'font-medium' : 'text-text-secondary'}`,
                }),
              ],
            }),
            el('div', {
              className: 'flex items-center gap-3 shrink-0 ml-2',
              children: [
                el('span', {
                  text: row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference),
                  className: `text-xs tabular-nums ${
                    row.goalDifference > 0 ? 'text-accent' : row.goalDifference < 0 ? 'text-live' : 'text-text-muted'
                  }`,
                }),
                el('span', {
                  text: String(row.points),
                  className: `text-sm font-bold tabular-nums ${qualified ? 'text-accent' : 'text-text-secondary'}`,
                }),
              ],
            }),
          ],
        });
      }),
    ],
  });
}

function createMatchResults(matches) {
  const byMatchday = [[], [], []];
  for (const m of matches) byMatchday[m.matchday].push(m);

  return el('div', {
    children: [
      el('p', { text: 'Resultados por Jornada', className: 'section-title' }),
      ...byMatchday.map((dayMatches, day) =>
        el('div', {
          className: 'mb-5',
          children: [
            el('h4', {
              className: 'text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider',
              text: `Jornada ${day + 1}`,
            }),
            el('div', {
              className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2',
              children: dayMatches.map(m => createMatchResultCard(m)),
            }),
          ],
        })
      ),
    ],
  });
}

function createMatchResultCard(m) {
  const aWon = m.goalsA > m.goalsB;
  const bWon = m.goalsB > m.goalsA;

  return el('div', {
    className: 'card p-3',
    children: [
      el('div', {
        className: 'text-[10px] text-text-muted mb-2 uppercase tracking-wider font-medium',
        text: `Grupo ${m.groupLetter}`,
      }),
      el('div', {
        className: 'flex items-center gap-2',
        children: [
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0',
            children: [
              flag(m.teamA.code, 20),
              el('span', { text: m.teamA.name, className: `text-xs truncate ${aWon ? 'font-bold' : ''}` }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-1 shrink-0',
            children: [
              el('span', {
                text: String(m.goalsA),
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${aWon ? 'score-num-winner' : ''}`,
              }),
              el('span', { text: '-', className: 'text-text-muted text-[10px]' }),
              el('span', {
                text: String(m.goalsB),
                className: `score-num text-xs !min-w-[26px] !h-[26px] ${bWon ? 'score-num-winner' : ''}`,
              }),
            ],
          }),
          el('div', {
            className: 'flex items-center gap-1.5 flex-1 min-w-0 justify-end',
            children: [
              el('span', { text: m.teamB.name, className: `text-xs truncate ${bWon ? 'font-bold' : ''}` }),
              flag(m.teamB.code, 20),
            ],
          }),
        ],
      }),
    ],
  });
}
