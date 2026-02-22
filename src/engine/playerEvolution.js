/**
 * Player evolution between World Cup editions.
 * Each edition = 4 real years. Players age, may retire, and are replaced
 * by new fictional players generated deterministically.
 */
import { createPRNG, combineSeed } from './prng.js';
import { getBaseSquad, generateBaseSquad, SQUAD_POSITIONS, POSITION_GOAL_WEIGHT } from './players.js';
import { getTeamByCode } from './teams.js';

// Cache of evolved squads per (teamCode, edition)
const squadCache = new Map();

// Years per edition (World Cup cycle)
const YEARS_PER_EDITION = 4;

/**
 * Probability of retirement based on age at the time of the new edition.
 * Thresholds are set so no player ever appears in a squad older than 37:
 *   age ≥ 38 → guaranteed retirement (newAge = prevAge + 4, so 34 → 38 → gone)
 *   age = 37 → 85 % retire  →  rare survivors are realistic (Maldini, Buffon tier)
 *   age = 35–36 → 45 % retire → possible veterans
 *   age = 33–34 → 18 % retire → experienced regulars
 *   age = 31–32 →  6 % retire → prime players rarely leave early
 *   else       →  2 % retire → injury / surprise retirement
 */
function retirementProbability(age) {
  if (age >= 38) return 1.0;
  if (age >= 36) return 0.85;
  if (age >= 34) return 0.45;
  if (age >= 32) return 0.18;
  if (age >= 30) return 0.06;
  return 0.02;
}

/**
 * Rating evolution between editions (small adjustments).
 * Young players improve; veterans decline slightly.
 */
function evolveRating(rng, rating, currentAge) {
  if (currentAge <= 23) {
    // Young: can improve up to +8
    return Math.min(99, rating + rng.nextInt(0, 8));
  }
  if (currentAge <= 27) {
    // Peak: tiny fluctuations
    return Math.min(99, Math.max(25, rating + rng.nextInt(-1, 3)));
  }
  if (currentAge <= 30) {
    // Stable peak
    return Math.min(99, Math.max(25, rating + rng.nextInt(-2, 1)));
  }
  // Declining
  return Math.min(99, Math.max(25, rating + rng.nextInt(-4, 0)));
}

/**
 * Generate a replacement player for a retired slot.
 * The replacement is young (18–23) and rated lower than average squad rating.
 */
function generateReplacement(rng, teamCode, position, slotIndex, pool, teamRating) {
  // Import inline to avoid circular deps — use pool passed from caller
  const firstName = pool.first[Math.floor(rng.next() * pool.first.length)];
  const lastName = pool.last[Math.floor(rng.next() * pool.last.length)];
  const name = `${firstName} ${lastName}`;

  // Replacement ratings: young prospect, generally below the squad average
  const minRating = Math.max(25, teamRating - 30);
  const maxRating = Math.max(minRating + 5, teamRating - 8);
  const rating = rng.nextInt(minRating, maxRating);
  const age = Math.max(18, rng.nextInt(18, 23));

  return {
    id: `${teamCode}-slot${slotIndex}-gen${Math.floor(rng.next() * 9999)}`,
    name,
    teamCode,
    position,
    rating,
    age,
    isReplacement: true,
  };
}

/**
 * Get the squad for a specific team and edition.
 * Applies aging, retirement, and replacement deterministically.
 */
export function getSquadForEdition(teamCode, edition) {
  const cacheKey = `${teamCode}:${edition}`;
  if (squadCache.has(cacheKey)) return squadCache.get(cacheKey);

  // Base case
  if (edition === 0) {
    const squad = getBaseSquad(teamCode);
    squadCache.set(cacheKey, squad);
    return squad;
  }

  const prevSquad = getSquadForEdition(teamCode, edition - 1);
  const team = getTeamByCode(teamCode);
  const teamRating = team ? team.rating : 60;

  const rng = createPRNG(combineSeed('evolution', teamCode, edition));

  // Lazily import pool for replacement generation
  // (same approach as players.js — re-derive from culture map)
  const pool = getPoolForCode(teamCode);

  const newSquad = prevSquad.map((player, slotIndex) => {
    const newAge = player.age + YEARS_PER_EDITION;
    const retireProb = retirementProbability(newAge);

    if (rng.next() < retireProb) {
      // Player retires — generate a replacement
      return generateReplacement(rng, teamCode, player.position, slotIndex, pool, teamRating);
    }

    // Player returns for another World Cup
    const newRating = evolveRating(rng, player.rating, newAge);
    return { ...player, age: newAge, rating: newRating };
  });

  squadCache.set(cacheKey, newSquad);
  return newSquad;
}

/**
 * Clear evolution cache (useful after tests or resets).
 */
export function clearSquadCache() {
  squadCache.clear();
}

// ── Inline culture/pool resolution (mirrors players.js without circular dep) ──

const CULTURE_MAP = {
  'fr': 'french', 'be': 'french', 'nc': 'french', 'pf': 'french', 'ht': 'french',
  'es': 'spanish', 'ar': 'spanish', 'mx': 'spanish', 'co': 'spanish', 'uy': 'spanish',
  'cl': 'spanish', 'pe': 'spanish', 'ec': 'spanish', 'py': 'spanish', 've': 'spanish',
  'bo': 'spanish', 'cr': 'spanish', 'pa': 'spanish', 'hn': 'spanish', 'sv': 'spanish',
  'gt': 'spanish', 'cw': 'spanish', 'do': 'spanish', 'cu': 'spanish', 'ni': 'spanish',
  'pt': 'portuguese', 'br': 'portuguese', 'ao': 'portuguese', 'cv': 'portuguese', 'mz': 'portuguese',
  'it': 'italian', 'cy': 'italian',
  'de': 'germanic', 'nl': 'germanic', 'at': 'germanic', 'ch': 'germanic', 'lu': 'germanic',
  'dk': 'nordic', 'se': 'nordic', 'no': 'nordic', 'fi': 'nordic', 'is': 'nordic', 'ee': 'nordic',
  'gb-eng': 'british', 'gb-sct': 'british', 'gb-wls': 'british', 'ie': 'british',
  'us': 'british', 'ca': 'british', 'jm': 'british', 'tt': 'british',
  'au': 'oceanian', 'nz': 'oceanian',
  'pl': 'slavic_west', 'cz': 'slavic_west', 'sk': 'slavic_west', 'si': 'slavic_west',
  'hu': 'hungarian',
  'ua': 'slavic_east', 'ru': 'slavic_east', 'by': 'slavic_east', 'lt': 'slavic_east',
  'lv': 'slavic_east', 'ge': 'slavic_east', 'am': 'slavic_east', 'kz': 'slavic_east',
  'hr': 'balkan', 'rs': 'balkan', 'ba': 'balkan', 'me': 'balkan', 'mk': 'balkan', 'al': 'balkan',
  'bg': 'slavic_east', 'ro': 'romanian',
  'tr': 'turkish', 'az': 'turkish',
  'gr': 'greek', 'il': 'middle_east',
  'ma': 'north_african', 'dz': 'north_african', 'tn': 'north_african',
  'eg': 'north_african', 'ly': 'north_african',
  'ng': 'west_african', 'cm': 'west_african', 'gh': 'west_african', 'sn': 'west_african',
  'ci': 'west_african', 'ml': 'west_african', 'bf': 'west_african', 'cd': 'west_african',
  'gn': 'west_african', 'ga': 'west_african', 'bj': 'west_african', 'tg': 'west_african',
  'za': 'east_african', 'ug': 'east_african', 'tz': 'east_african', 'zm': 'east_african',
  'zw': 'east_african', 'mg': 'east_african', 'na': 'east_african', 'ke': 'east_african',
  'jp': 'east_asian', 'kr': 'east_asian', 'cn': 'east_asian', 'kp': 'east_asian',
  'ir': 'iranian',
  'sa': 'middle_east', 'qa': 'middle_east', 'ae': 'middle_east', 'iq': 'middle_east',
  'jo': 'middle_east', 'om': 'middle_east', 'bh': 'middle_east', 'ps': 'middle_east', 'sy': 'middle_east',
  'uz': 'central_asian', 'kg': 'central_asian',
  'in': 'southeast_asian', 'th': 'southeast_asian', 'vn': 'southeast_asian',
  'id': 'southeast_asian', 'my': 'southeast_asian',
  'pg': 'pacific_islander', 'fj': 'pacific_islander', 'sb': 'pacific_islander',
  'vu': 'pacific_islander', 'ws': 'pacific_islander', 'to': 'pacific_islander',
};

// Minimal name pools (subset) for replacement generation — mirrors players.js
const REPLACEMENT_POOLS = {
  french: { first: ['Théo','Lucas','Maxime','Romain','Nathan','Baptiste','Axel'], last: ['Martin','Dupont','Bernard','Leroy','Moreau','Simon','Renard'] },
  spanish: { first: ['Adrián','Pablo','Marcos','Víctor','Diego','Jorge'], last: ['García','López','Martínez','Sánchez','Rodríguez','Pérez'] },
  portuguese: { first: ['João','Pedro','Diogo','André','Bruno','Rafael'], last: ['Silva','Ferreira','Santos','Oliveira','Costa','Pereira'] },
  italian: { first: ['Matteo','Lorenzo','Federico','Andrea','Luca','Marco'], last: ['Rossi','Ferrari','Ricci','Esposito','Romano','Bianchi'] },
  germanic: { first: ['Niklas','Florian','Jonas','Tim','Felix','Lukas'], last: ['Müller','Schmidt','Weber','Fischer','Bauer','Schneider'] },
  nordic: { first: ['Emil','Oscar','Magnus','Rasmus','Viktor','Anders'], last: ['Hansen','Jensen','Andersen','Nielsen','Eriksen','Larsen'] },
  british: { first: ['Jack','Tom','Oliver','Mason','Liam','Ethan'], last: ['Smith','Jones','Williams','Brown','Taylor','Davies'] },
  slavic_east: { first: ['Nikita','Ivan','Aleksei','Artem','Daniil'], last: ['Petrov','Ivanov','Sokolov','Kozlov','Volkov'] },
  slavic_west: { first: ['Jakub','Mateusz','Filip','Kamil','Marek'], last: ['Kowalski','Wiśniewski','Dąbrowski','Wójcik','Lewandowski'] },
  balkan: { first: ['Nikola','Luka','Marko','Petar','Ivan'], last: ['Jović','Lukić','Nikolić','Marković','Ilić'] },
  north_african: { first: ['Rayan','Zakaria','Ayoub','Amine','Yassine'], last: ['Benali','Amrabat','Ounahi','Ghezzal','Benrahma'] },
  west_african: { first: ['Abdoulaye','Ibrahim','Cheick','Samuel','Victor'], last: ['Diallo','Konaté','Traoré','Mendy','Sarr'] },
  east_african: { first: ['James','Samuel','Peter','David','John'], last: ['Ouma','Ndungú','Phiri','Chirwa','Mukiibi'] },
  middle_east: { first: ['Ahmed','Omar','Khalid','Hassan','Salem'], last: ['Al-Harbi','Al-Ghamdi','Al-Hassan','Alshehri','Almutairi'] },
  east_asian: { first: ['Rui','Yu','Kai','Jun','Sho'], last: ['Kim','Park','Lee','Chen','Wang'] },
  southeast_asian: { first: ['Ahmad','Rizky','Tristan','Arif','Nguyen'], last: ['Fauzi','Rasid','Hanis','Tran','Le'] },
  central_asian: { first: ['Eldor','Sardor','Bekzod','Nodir','Rustam'], last: ['Shomurodov','Tursunov','Kholmatov','Yusupov','Narzullayev'] },
  oceanian: { first: ['Jake','Sam','Josh','Ryan','Tom'], last: ['Smith','Brown','Robinson','Mitchell','Campbell'] },
  pacific_islander: { first: ['Sione','Manu','Tala','Ioane','Tana'], last: ['Folau','Finau','Havili','Ioane','Faleolo'] },
  iranian: { first: ['Mehdi','Amir','Reza','Saeid','Sardar'], last: ['Taremi','Azmoun','Jahanbakhsh','Gholizadeh','Hosseini'] },
  turkish: { first: ['Kaan','Ferdi','Yusuf','Kenan','Mert'], last: ['Yılmaz','Şahin','Kökcü','Yıldız','Çelik'] },
  greek: { first: ['Nikos','Giorgos','Kostas','Dimitris','Yannis'], last: ['Bakasetas','Pavlidis','Tsimikas','Vlachodimos','Fortounis'] },
  hungarian: { first: ['Ádám','Bence','Roland','Tamás','Márton'], last: ['Nagy','Szalai','Sallai','Schäfer','Gulácsi'] },
  romanian: { first: ['Radu','Andrei','Mihai','Alexandru','Florin'], last: ['Stanciu','Dragusin','Hagi','Nedelcearu','Coman'] },
};

function getPoolForCode(code) {
  const key = CULTURE_MAP[code] || 'british';
  return REPLACEMENT_POOLS[key] || REPLACEMENT_POOLS.british;
}

/**
 * Get the starting XI and 5 substitutions for a specific match.
 * Returns { starters, substitutions } where:
 *   - starters: 11 players (play from kick-off until subbed off or final whistle)
 *   - substitutions: up to 5 × { playerIn, playerOut, minute } sorted by entry minute
 *
 * Bench selection is weighted by rating² so better bench players come on more often.
 * GK bench slots get ~2% of that weight (they almost never sub in during normal play).
 * Deterministic: same inputs → same lineup every time.
 */
export function getMatchLineup(squad, teamCode, edition, matchId) {
  const rng = createPRNG(combineSeed('lineup', teamCode, edition, matchId));

  const gks = squad.filter(p => p.position === 'GK').sort((a, b) => b.rating - a.rating);
  const dfs = squad.filter(p => p.position === 'DF').sort((a, b) => b.rating - a.rating);
  const mfs = squad.filter(p => p.position === 'MF').sort((a, b) => b.rating - a.rating);
  const fws = squad.filter(p => p.position === 'FW').sort((a, b) => b.rating - a.rating);

  // Starting XI: 1 GK + 4 DF + 4 MF + 2 FW
  const starters = [
    ...gks.slice(0, 1),
    ...dfs.slice(0, 4),
    ...mfs.slice(0, 4),
    ...fws.slice(0, 2),
  ];

  // Bench: the remaining 14 players
  const bench = [
    ...gks.slice(1),
    ...dfs.slice(4),
    ...mfs.slice(4),
    ...fws.slice(2),
  ];

  // Pick up to 5 sub candidates weighted by rating².
  // GK bench weight is 2% of an outfield player's — they almost never come on.
  const benchWeights = bench.map(p =>
    p.position === 'GK' ? p.rating * p.rating * 0.02 : p.rating * p.rating
  );
  const numSubs = Math.min(5, bench.length);
  const subCandidates = [];
  const availableBench = [...bench];
  const availableWeights = [...benchWeights];

  for (let i = 0; i < numSubs; i++) {
    if (availableBench.length === 0) break;
    const player = rng.weightedSample(availableBench, availableWeights);
    const idx = availableBench.indexOf(player);
    subCandidates.push(player);
    availableBench.splice(idx, 1);
    availableWeights.splice(idx, 1);
  }

  // Assign realistic entry minutes (sorted ascending after generation).
  // Windows based on real World Cup substitution patterns:
  //   Sub 1 — tactical / half-time change : 45–62
  //   Sub 2 — energy / tactical           : 55–70
  //   Sub 3 — mid-to-late 2nd half        : 62–76
  //   Sub 4 — late 2nd half               : 70–83
  //   Sub 5 — very late / time-wasting    : 79–90
  const subWindows = [[45, 62], [55, 70], [62, 76], [70, 83], [79, 90]];
  const rawMinutes = subCandidates.map((_, i) => {
    const [lo, hi] = subWindows[i] || [60, 85];
    return rng.nextInt(lo, hi);
  });
  rawMinutes.sort((a, b) => a - b);

  // For each sub, decide which starter comes off:
  // prefer same position group, otherwise the lowest-rated available starter.
  const availableStarters = [...starters];
  const substitutions = subCandidates.map((playerIn, i) => {
    const samePos = availableStarters.filter(s => s.position === playerIn.position);
    const pool = samePos.length > 0 ? samePos : availableStarters;
    pool.sort((a, b) => a.rating - b.rating);
    const playerOut = pool[0];
    availableStarters.splice(availableStarters.indexOf(playerOut), 1);
    return { playerIn, playerOut, minute: rawMinutes[i] };
  });

  return { starters, substitutions };
}

/**
 * Compute player stats (goals, matches, minutes) across all matches of a tournament.
 * Playing-time model:
 *   - Starters play from minute 1 until subbed off (or final whistle).
 *   - Subs play from their entry minute to the final whistle.
 *   - Players not in the match lineup play 0 minutes and cannot score.
 * Goal scorers are always on-field players (enforced in match.js via getPlayersOnField).
 */
export function computePlayerStats(teamCode, edition, teamMatches) {
  const squad = getSquadForEdition(teamCode, edition);
  const stats = {};
  for (const player of squad) {
    stats[player.id] = { goals: 0, matches: 0, mins: 0 };
  }

  for (const { match, side, matchMinutes } of teamMatches) {
    const events = match.events || [];
    const teamGoalEvents = events.filter(e => e.team === side && e.type === 'goal');
    const { starters, substitutions } = getMatchLineup(squad, teamCode, edition, match.matchId);

    // Starters: play from kick-off until subbed off (or full match)
    for (const starter of starters) {
      const sub = substitutions.find(s => s.playerOut.id === starter.id);
      const minsPlayed = sub
        ? Math.min(sub.minute - 1, matchMinutes)
        : matchMinutes;
      if (minsPlayed > 0) {
        stats[starter.id].matches++;
        stats[starter.id].mins += minsPlayed;
      }
    }

    // Subs: play from their entry minute to the final whistle
    for (const sub of substitutions) {
      if (sub.minute < matchMinutes) {
        stats[sub.playerIn.id].matches++;
        stats[sub.playerIn.id].mins += matchMinutes - sub.minute;
      }
    }

    // Attribute goals (scorers are guaranteed to be on-field players via match.js)
    for (const event of teamGoalEvents) {
      if (event.scorerId && stats[event.scorerId] !== undefined) {
        stats[event.scorerId].goals++;
      }
    }
  }

  return { squad, stats };
}
