/**
 * Local notification system.
 * Uses ServiceWorkerRegistration.showNotification() when available (required
 * in browsers that have an active SW), falls back to new Notification() in
 * dev / environments without SW.
 */

const PREF_KEY = 'wcs_notif_prefs';
const DEFAULTS = { goals: true, matchEnd: true, champion: true };

// Cache the SW registration so we don't call ready() on every notification
let swReg = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => { swReg = reg; });
}

/* ── Permission ──────────────────────────────────────────────────── */

export function getNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return await Notification.requestPermission();
}

/* ── Preferences ─────────────────────────────────────────────────── */

export function getNotifPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotifPref(key, val) {
  const prefs = getNotifPrefs();
  prefs[key] = val;
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

/* ── Send ────────────────────────────────────────────────────────── */

function sendNotif(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: './assets/icon-192.png', tag };
  if (swReg) {
    swReg.showNotification(title, opts);
  } else {
    // Dev fallback: no SW active
    new Notification(title, opts); // eslint-disable-line no-new
  }
}

/* ── Event detection ─────────────────────────────────────────────── */

/**
 * Compare prevState and newState to detect goal/match-end/champion events
 * and fire the corresponding notification. Call once per tick.
 */
export function detectAndNotify(prevState, newState) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!newState) return;

  const prefs = getNotifPrefs();
  const prevLive = prevState?.liveMatches || [];
  const currLive = newState?.liveMatches || [];

  // ── New goals ────────────────────────────────────────────────────
  if (prefs.goals) {
    for (const match of currLive) {
      const prev = prevLive.find(m => m.matchId === match.matchId);
      const prevCount = prev?.events?.length ?? 0;
      const currCount = match.events?.length ?? 0;
      if (currCount > prevCount) {
        for (const goal of match.events.slice(prevCount)) {
          const scorer = goal.scorerName
            ? `${goal.scorerName} (${goal.minute}')`
            : `Min. ${goal.minute}'`;
          const score = `${match.teamA.name} ${match.goalsA}–${match.goalsB} ${match.teamB.name}`;
          sendNotif('⚽ ¡Gol!', `${scorer} · ${score}`, `goal-${match.matchId}-${goal.minute}`);
        }
      }
    }
  }

  // ── Match just ended ─────────────────────────────────────────────
  if (prefs.matchEnd) {
    for (const prev of prevLive) {
      if (!currLive.find(m => m.matchId === prev.matchId)) {
        const score = `${prev.teamA.name} ${prev.goalsA}–${prev.goalsB} ${prev.teamB.name}`;
        sendNotif('Partido terminado', score, `end-${prev.matchId}`);
      }
    }
  }

  // ── Champion crowned ──────────────────────────────────────────────
  if (prefs.champion) {
    if (prevState?.phase?.phase !== 'CELEBRATION' && newState?.phase?.phase === 'CELEBRATION') {
      const champ = newState.tournament?.champion?.name;
      if (champ) {
        sendNotif('🏆 ¡Campeón del Mundo!', `${champ} gana el Mundial #${newState.edition}`, 'champion');
      }
    }
  }
}
