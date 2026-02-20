import { el, flag, getEditionYear } from '../components.js';
import { getSquadForEdition } from '../../engine/playerEvolution.js';
import { POSITION_GOAL_WEIGHT } from '../../engine/players.js';

// Position labels
const POS_LABEL = { GK: 'Portero', DF: 'Defensa', MF: 'Centrocampista', FW: 'Delantero' };
const POS_SHORT = { GK: 'POR', DF: 'DEF', MF: 'MED', FW: 'DEL' };
const POS_ORDER = ['GK', 'DF', 'MF', 'FW'];
const POS_COLOR = {
  GK: 'text-yellow-500 dark:text-yellow-400',
  DF: 'text-blue-500 dark:text-blue-400',
  MF: 'text-green-500 dark:text-green-400',
  FW: 'text-red-500 dark:text-red-400',
};

// Persistent state
let expandedTeam = null; // teamCode currently expanded

/**
 * Teams view — squads for every team in the current World Cup.
 */
export function renderTeams(container, state) {
  container.innerHTML = '';
  expandedTeam = expandedTeam; // preserve across re-renders

  if (!state || !state.tournament) {
    container.appendChild(el('div', { className: 'card p-12 text-center', children: [
      el('p', { text: 'Cargando torneo...', className: 'text-sm text-text-muted' }),
    ] }));
    return;
  }

  const { edition, tournament } = state;
  const year = getEditionYear(edition);

  // Header
  container.appendChild(
    el('div', {
      className: 'flex items-center gap-3 mb-5',
      children: [
        el('h2', { text: `Equipos — Mundial ${year}`, className: 'text-lg md:text-xl font-bold' }),
      ],
    })
  );

  // Legend for positions
  container.appendChild(
    el('div', {
      className: 'flex flex-wrap gap-3 mb-4 text-xs text-text-muted',
      children: POS_ORDER.map(pos =>
        el('span', {
          className: `flex items-center gap-1 ${POS_COLOR[pos]}`,
          children: [
            el('span', { text: POS_SHORT[pos], className: 'font-bold' }),
            el('span', { text: POS_LABEL[pos], className: 'text-text-muted' }),
          ],
        })
      ),
    })
  );

  // Build list of teams from the current edition's draw
  const teams = tournament.draw.groups.flat();
  const playerStats = tournament.playerStats || {};

  const grid = el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3' });

  for (const team of teams) {
    const squad = getSquadForEdition(team.code, edition);
    const card = createTeamCard(team, squad, playerStats, edition, () => {
      if (expandedTeam === team.code) {
        expandedTeam = null;
      } else {
        expandedTeam = team.code;
      }
      renderTeams(container, state);
    });
    grid.appendChild(card);
  }

  container.appendChild(grid);
}

function createTeamCard(team, squad, playerStats, edition, onToggle) {
  const isExpanded = expandedTeam === team.code;

  // Sort squad by position group order then rating desc
  const sortedSquad = [...squad].sort((a, b) => {
    const po = POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position);
    return po !== 0 ? po : b.rating - a.rating;
  });

  const header = el('div', {
    className: 'flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none',
    events: { click: onToggle },
    children: [
      flag(team.code, 32),
      el('div', { className: 'flex-1 min-w-0', children: [
        el('div', { text: team.name, className: 'text-sm font-semibold truncate' }),
        el('div', { text: `Rating: ${team.rating}`, className: 'text-xs text-text-muted' }),
      ] }),
      el('span', {
        html: isExpanded
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>',
        className: 'w-4 h-4 text-text-muted shrink-0',
      }),
    ],
  });

  const children = [header];

  if (isExpanded) {
    const squadTable = createSquadTable(sortedSquad, playerStats);
    children.push(el('div', {
      className: 'border-t border-border-subtle',
      children: [squadTable],
    }));
  }

  return el('div', {
    className: 'card overflow-hidden',
    children,
  });
}

function createSquadTable(squad, playerStats) {
  const rows = squad.map(player => {
    const stats = playerStats[player.id] || { goals: 0, matches: 0, mins: 0 };
    const posColor = POS_COLOR[player.position];

    return el('div', {
      className: 'flex items-center gap-2 px-3 py-1.5 hover:bg-bg-hover/40 text-xs',
      children: [
        el('span', {
          text: POS_SHORT[player.position],
          className: `w-7 shrink-0 font-bold ${posColor}`,
        }),
        el('span', { text: player.name, className: 'flex-1 min-w-0 truncate text-text-primary' }),
        el('span', { text: player.rating, className: 'w-6 text-right text-text-muted font-mono' }),
        el('span', { text: player.age, className: 'w-6 text-right text-text-muted' }),
        el('span', {
          text: stats.goals > 0 ? String(stats.goals) : '',
          className: 'w-8 text-right text-text-secondary font-medium',
        }),
        el('span', { text: `${stats.mins}'`, className: 'w-10 text-right text-text-muted font-mono' }),
      ],
    });
  });

  return el('div', {
    children: [
      // Column headers
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
  });
}
