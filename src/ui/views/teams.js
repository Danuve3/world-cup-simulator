import { el, flag, getEditionYear } from '../components.js';
import { getSquadForEdition } from '../../engine/playerEvolution.js';
import { computeCurrentPlayerStats } from '../../engine/simulation.js';
import { navigate } from '../router.js';
import { renderPlayerDetail } from './player-detail.js';

const POS_SHORT = { GK: 'POR', DF: 'DEF', MF: 'MED', FW: 'DEL' };
const POS_ORDER = ['GK', 'DF', 'MF', 'FW'];
const POS_COLOR = {
  GK: 'text-yellow-500 dark:text-yellow-400',
  DF: 'text-blue-500 dark:text-blue-400',
  MF: 'text-green-500 dark:text-green-400',
  FW: 'text-red-500 dark:text-red-400',
};

/**
 * Teams view — squads for every team in the current World Cup.
 * params[0] = teamCode → renders squad detail page for that team.
 */
export function renderTeams(container, state, params = []) {
  container.innerHTML = '';

  if (!state || !state.tournament) {
    container.appendChild(el('div', { className: 'card p-12 text-center', children: [
      el('p', { text: 'Cargando torneo...', className: 'text-sm text-text-muted' }),
    ] }));
    return;
  }

  if (params[0] && params[1]) {
    renderPlayerDetail(container, state, params[0], params[1]);
    return;
  }

  if (params[0]) {
    renderTeamDetail(container, state, params[0]);
    return;
  }

  const { edition, tournament } = state;
  const year = getEditionYear(edition);
  const teams = tournament.draw.groups.flat();

  container.appendChild(
    el('h2', { text: `Plantillas — Mundial ${year}`, className: 'text-lg md:text-xl font-bold mb-5' })
  );

  const grid = el('div', { className: 'grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2' });

  for (const team of teams) {
    grid.appendChild(
      el('button', {
        className: 'card card-interactive flex flex-col items-center gap-2 p-2.5 text-center',
        events: { click: () => navigate('/teams/' + team.code) },
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

  container.appendChild(grid);
}

function renderTeamDetail(container, state, teamCode) {
  const { edition, tournament } = state;
  const teams = tournament.draw.groups.flat();
  const team = teams.find(t => t.code === teamCode);

  if (!team) {
    container.appendChild(el('p', { text: 'Equipo no encontrado.', className: 'text-sm text-text-muted' }));
    return;
  }

  // Back button
  container.appendChild(
    el('button', {
      className: 'flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer mb-5 font-medium',
      events: { click: () => navigate('/teams') },
      children: [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
        el('span', { text: 'Plantillas' }),
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
        ] }),
      ],
    })
  );

  // Squad table with live stats
  const squad = getSquadForEdition(team.code, edition);
  const liveStats = computeCurrentPlayerStats(team.code, edition, state.cycleMinute, tournament);

  const sorted = [...squad].sort((a, b) => {
    const po = POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position);
    return po !== 0 ? po : b.rating - a.rating;
  });

  container.appendChild(
    el('div', { className: 'card overflow-hidden', children: [createSquadTable(sorted, liveStats, teamCode)] })
  );
}

function createSquadTable(squad, playerStats, teamCode) {
  const rows = squad.map(player => {
    const stats = playerStats[player.id] || { goals: 0, matches: 0, mins: 0 };
    const posColor = POS_COLOR[player.position];

    return el('div', {
      className: 'flex items-center gap-2 px-3 py-1.5 hover:bg-bg-hover/40 active:bg-bg-hover/60 text-xs cursor-pointer',
      events: { click: () => navigate(`/teams/${teamCode}/${player.id}`) },
      children: [
        el('span', { text: POS_SHORT[player.position], className: `w-7 shrink-0 font-bold ${posColor}` }),
        el('span', { text: player.name, className: 'flex-1 min-w-0 truncate text-text-primary' }),
        el('span', { text: player.rating, className: 'w-6 text-right text-text-muted font-mono' }),
        el('span', { text: player.age, className: 'w-6 text-right text-text-muted' }),
        el('span', {
          text: stats.goals > 0 ? String(stats.goals) : '',
          className: 'w-8 text-right text-text-secondary font-medium',
        }),
        el('span', { text: `${stats.mins}'`, className: 'w-10 text-right text-text-muted font-mono' }),
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3 text-text-muted/40 shrink-0"><path d="M9 18l6-6-6-6"/></svg>' }),
      ],
    });
  });

  return el('div', {
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
          el('span', { className: 'w-3' }),
        ],
      }),
      ...rows,
    ],
  });
}
