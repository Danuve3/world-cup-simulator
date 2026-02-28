import { el, flag, getEditionYear } from '../components.js';
import { getSquadForEdition } from '../../engine/playerEvolution.js';
import { getPlayerCareerStats, getCompletedTournaments } from '../../engine/simulation.js';
import { navigate } from '../router.js';
import { getPlayerPhotoUrl } from '../../engine/playerPhotos.js';

const POS_LABEL = { GK: 'Portero', DF: 'Defensa', MF: 'Centrocampista', FW: 'Delantero' };
const POS_COLOR = {
  GK: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  DF: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  MF: 'bg-green-500/15 text-green-600 dark:text-green-400',
  FW: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

/**
 * Render full player profile view.
 * @param {string|null} backPath - Override back-button destination (defaults to /teams/{teamCode})
 * @param {number|null} viewEdition - Edition to look up the player in (defaults to state.edition)
 */
export function renderPlayerDetail(container, state, teamCode, playerId, backPath = null, viewEdition = null, backLabel = null) {
  container.innerHTML = '';

  if (!state || !state.tournament) {
    container.appendChild(el('div', { className: 'card p-12 text-center', children: [
      el('p', { text: 'Cargando...', className: 'text-sm text-text-muted' }),
    ] }));
    return;
  }

  const { edition, tournament } = state;
  const squadEdition = viewEdition ?? edition;

  // Find team — try current tournament first, fall back to historical tournaments
  let teams = tournament.draw.groups.flat();
  let team = teams.find(t => t.code === teamCode);
  if (!team && viewEdition != null) {
    const historical = getCompletedTournaments(state.timestamp);
    const hist = historical.find(h => h.edition === viewEdition);
    if (hist) {
      teams = hist.tournament.draw.groups.flat();
      team = teams.find(t => t.code === teamCode);
    }
  }

  // Find player in the relevant edition's squad
  const squad = getSquadForEdition(teamCode, squadEdition);
  const player = squad.find(p => p.id === playerId);

  if (!player || !team) {
    container.appendChild(el('p', { text: 'Jugador no encontrado.', className: 'text-sm text-text-muted' }));
    return;
  }

  // Back button
  const backDest = backPath ?? `/teams/${teamCode}`;
  const backText = backLabel ?? team.name;
  container.appendChild(
    el('button', {
      className: 'flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer mb-5 font-medium',
      events: { click: () => navigate(backDest) },
      children: [
        el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
        el('span', { text: backText }),
      ],
    })
  );

  // Identity card
  const identityCard = createIdentityCard(player, team);
  container.appendChild(identityCard);

  // Swap initials avatar for AI photo once loaded
  getPlayerPhotoUrl(playerId, teamCode).then(url => {
    if (!url) return;
    const placeholder = identityCard.querySelector('[data-avatar]');
    if (!placeholder) return;
    const img = document.createElement('img');
    img.className = 'w-[100px] h-[100px] rounded-full object-cover shrink-0 select-none';
    img.alt = player.name;
    img.src = url;
    img.onerror = () => { /* keep initials on broken image */ };
    placeholder.replaceWith(img);
  });

  // Career stats
  const careerStats = getPlayerCareerStats(playerId, teamCode, state.timestamp, state.liveEditionGoals);
  container.appendChild(createCareerTable(careerStats, edition));
}

// ── Identity card ─────────────────────────────────────────────────────────────

function createIdentityCard(player, team) {
  const posColorClass = POS_COLOR[player.position];

  // Avatar with player initials
  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const avatarBg = {
    GK: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    DF: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    MF: 'bg-green-500/20 text-green-600 dark:text-green-400',
    FW: 'bg-red-500/20 text-red-600 dark:text-red-400',
  }[player.position];

  const avatar = el('div', {
    className: `w-[100px] h-[100px] rounded-full ${avatarBg} flex items-center justify-center text-xl font-extrabold shrink-0 select-none`,
    text: initials,
    attrs: { 'data-avatar': '' },
  });

  // Format date of birth and age
  const dobFormatted = formatDOB(player.dateOfBirth);
  const currentAge = player.age;

  // Info rows
  const infoRows = [
    player.dateOfBirth
      ? el('div', { className: 'flex items-center gap-2 text-sm', children: [
          el('span', { text: 'Nac.', className: 'text-text-muted w-12 shrink-0 text-xs' }),
          el('span', { text: `${dobFormatted}`, className: 'text-text-secondary' }),
          el('span', { text: `(${currentAge} años)`, className: 'text-text-muted text-xs' }),
        ] })
      : null,
    player.birthCity
      ? el('div', { className: 'flex items-center gap-2 text-sm', children: [
          el('span', { text: 'Ciudad', className: 'text-text-muted w-12 shrink-0 text-xs' }),
          el('span', { text: player.birthCity, className: 'text-text-secondary' }),
        ] })
      : null,
    el('div', { className: 'flex items-center gap-2 text-sm', children: [
      el('span', { text: 'País', className: 'text-text-muted w-12 shrink-0 text-xs' }),
      el('div', { className: 'flex items-center gap-1.5', children: [
        flag(team.code, 20),
        el('span', { text: team.name, className: 'text-text-secondary' }),
      ] }),
    ] }),
  ].filter(Boolean);

  const infoBlock = el('div', {
    className: 'flex-1 min-w-0',
    children: [
      el('div', { className: 'flex items-start gap-2 mb-2 flex-wrap', children: [
        el('h2', { text: player.name, className: 'text-lg font-bold text-text-primary leading-tight' }),
        el('span', { text: POS_LABEL[player.position], className: `text-xs font-semibold px-2 py-0.5 rounded-full ${posColorClass}` }),
      ] }),
      el('div', { className: 'space-y-1.5', children: infoRows }),
    ],
  });

  return el('div', {
    className: 'card p-5 mb-4 flex items-start gap-4',
    children: [avatar, infoBlock],
  });
}

// ── Career stats table ────────────────────────────────────────────────────────

function createCareerTable(careerStats, currentEdition) {
  // Filter to editions the player participated in (for totals)
  const played = careerStats.filter(r => r.participated && r.played > 0);

  // Totals row
  const totalPJ  = played.reduce((s, r) => s + r.played, 0);
  const totalMin = played.reduce((s, r) => s + r.minutes, 0);
  const totalPT  = played.reduce((s, r) => s + r.started, 0);
  const totalGls = played.reduce((s, r) => s + r.goals, 0);

  // Weighted average rating by minutes
  const totalWeightedRating = played.reduce((s, r) => s + (r.rating || 0) * r.minutes, 0);
  const avgRating = totalMin > 0
    ? Math.round(totalWeightedRating / totalMin * 10) / 10
    : null;

  const goldenBoots = played.filter(r => r.goldenBoot).length;
  const goldenBalls = played.filter(r => r.goldenBall).length;

  // Table header
  const headerCols = [
    { text: 'Año',   cls: 'w-14' },
    { text: 'PJ',    cls: 'w-8 text-right' },
    { text: 'Min',   cls: 'w-10 text-right' },
    { text: 'PT',    cls: 'w-8 text-right' },
    { text: 'Goles', cls: 'w-10 text-right' },
    { text: 'Rtg',   cls: 'w-10 text-right' },
    { text: 'Bota',  cls: 'w-8 text-center' },
    { text: 'MVP',   cls: 'w-8 text-center' },
  ];

  const header = el('div', {
    className: 'flex items-center gap-1 px-3 py-2 border-b border-border-subtle text-[10px] font-bold uppercase tracking-wider text-text-muted',
    children: headerCols.map(c => el('span', { text: c.text, className: c.cls })),
  });

  // Edition rows
  const rows = careerStats.map(r => buildEditionRow(r, currentEdition));

  // Totals row
  const totalsRow = el('div', {
    className: 'flex items-center gap-1 px-3 py-2 border-t border-border-subtle text-xs font-bold bg-bg-hover/30',
    children: [
      el('span', { text: 'Total', className: 'w-14 text-text-muted uppercase text-[10px] tracking-wide' }),
      el('span', { text: totalPJ > 0 ? String(totalPJ) : '—', className: 'w-8 text-right text-text-primary font-mono' }),
      el('span', { text: totalMin > 0 ? String(totalMin) : '—', className: 'w-10 text-right text-text-primary font-mono' }),
      el('span', { text: totalPT > 0 ? String(totalPT) : '—', className: 'w-8 text-right text-text-primary font-mono' }),
      el('span', { text: totalGls > 0 ? String(totalGls) : '—', className: 'w-10 text-right text-text-primary font-mono' }),
      el('span', { text: avgRating != null ? String(avgRating) : '—', className: 'w-10 text-right text-accent font-mono' }),
      el('span', { text: goldenBoots > 0 ? `${goldenBoots}×` : '', className: 'w-8 text-center text-yellow-500 dark:text-yellow-400' }),
      el('span', { text: goldenBalls > 0 ? `${goldenBalls}×` : '', className: 'w-8 text-center text-purple-500 dark:text-purple-400' }),
    ],
  });

  return el('div', {
    className: 'card overflow-hidden mb-4',
    children: [
      el('div', {
        className: 'px-3 py-3 border-b border-border-subtle',
        children: [
          el('h3', { text: 'Historial de Mundiales', className: 'text-sm font-bold text-text-primary' }),
        ],
      }),
      el('div', { children: [header, ...rows, totalsRow] }),
    ],
  });
}

function buildEditionRow(r, currentEdition) {
  const isCurrentEdition = r.edition === currentEdition;
  const didNotParticipate = !r.participated || r.played === 0;

  const dash = el('span', { text: '—', className: 'text-text-muted/50' });
  const makeDash = () => el('span', { text: '—', className: 'text-text-muted/50' });

  const yearLabel = el('span', {
    text: String(r.year),
    className: `w-14 font-mono text-xs ${isCurrentEdition ? 'text-accent font-bold' : 'text-text-secondary'}`,
  });

  if (didNotParticipate) {
    return el('div', {
      className: 'flex items-center gap-1 px-3 py-1.5 text-xs opacity-50',
      children: [
        yearLabel,
        el('span', { text: '—', className: 'w-8 text-right text-text-muted' }),
        el('span', { text: '—', className: 'w-10 text-right text-text-muted' }),
        el('span', { text: '—', className: 'w-8 text-right text-text-muted' }),
        el('span', { text: '—', className: 'w-10 text-right text-text-muted' }),
        el('span', { text: '—', className: 'w-10 text-right text-text-muted' }),
        el('span', { className: 'w-8' }),
        el('span', { className: 'w-8' }),
      ],
    });
  }

  const ratingEl = r.rating != null
    ? el('span', { text: String(r.rating), className: `w-10 text-right font-mono ${ratingColor(r.rating)}` })
    : makeDash();

  return el('div', {
    className: `flex items-center gap-1 px-3 py-1.5 text-xs ${isCurrentEdition ? 'bg-accent/5' : 'hover:bg-bg-hover/20'}`,
    children: [
      yearLabel,
      el('span', { text: String(r.played), className: 'w-8 text-right font-mono text-text-primary' }),
      el('span', { text: String(r.minutes), className: 'w-10 text-right font-mono text-text-secondary' }),
      el('span', { text: String(r.started), className: 'w-8 text-right font-mono text-text-secondary' }),
      el('span', {
        text: String(r.goals),
        className: `w-10 text-right font-mono font-bold ${r.goals > 0 ? 'text-text-primary' : 'text-text-muted'}`,
      }),
      ratingEl,
      el('span', {
        text: r.goldenBoot ? '🥾' : '',
        className: 'w-8 text-center text-base leading-none',
        attrs: { title: r.goldenBoot ? 'Bota de Oro' : '' },
      }),
      el('span', {
        text: r.goldenBall ? '🏆' : '',
        className: 'w-8 text-center text-base leading-none',
        attrs: { title: r.goldenBall ? 'Balón de Oro' : '' },
      }),
    ],
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ratingColor(rating) {
  if (rating >= 8.5) return 'text-green-500 dark:text-green-400';
  if (rating >= 7.5) return 'text-accent';
  if (rating >= 6.5) return 'text-text-secondary';
  return 'text-text-muted';
}

function formatDOB(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}
