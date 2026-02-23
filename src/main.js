import './styles/main.css';
import { createAppShell, updateHeader, updateNav } from './ui/app.js';
import { route, initRouter, setOnRouteChange } from './ui/router.js';
import { getCurrentState } from './engine/simulation.js';
import { detectAndNotify } from './notifications.js';
import { renderDashboard } from './ui/views/dashboard.js';
import { renderGroups } from './ui/views/groups.js';
import { renderBracket } from './ui/views/bracket.js';
import { renderHistory } from './ui/views/history.js';
import { renderStats } from './ui/views/stats.js';
import { renderTeams } from './ui/views/teams.js';

let currentState = null;
let mainContainer = null;
let tickInterval = null;
let currentView = null;
let currentParams = [];

mainContainer = createAppShell();

route('/', (container) => {
  currentView = 'dashboard';
  renderDashboard(container, currentState);
});

route('/groups', (container) => {
  currentView = 'groups';
  renderGroups(container, currentState);
});

route('/bracket', (container) => {
  currentView = 'bracket';
  renderBracket(container, currentState);
});

route('/teams', (container, params) => {
  currentView = params[1] ? 'player' : 'teams';
  currentParams = params;
  renderTeams(container, currentState, params);
});

route('/history', (container, params) => {
  currentView = 'history';
  currentParams = params;
  renderHistory(container, currentState, params);
});

route('/stats', (container) => {
  currentView = 'stats';
  renderStats(container, currentState);
});

currentState = getCurrentState();
updateHeader(currentState);
setOnRouteChange(() => updateNav());
initRouter(mainContainer);

let lastEdition = currentState.edition;
let lastPhase = currentState.phase.phase;
let lastMinute = currentState.cycleMinute;

tickInterval = setInterval(() => {
  const prevState = currentState;
  const newState = getCurrentState();
  detectAndNotify(prevState, newState);

  const phaseChanged = newState.phase.phase !== lastPhase;
  const minuteChanged = newState.cycleMinute !== lastMinute;
  const editionChanged = newState.edition !== lastEdition;
  const hasLiveMatches = newState.liveMatches && newState.liveMatches.length > 0;
  // Force a render on the tick where the last live match ends
  const matchesJustEnded = (currentState?.liveMatches?.length > 0) && !hasLiveMatches;

  // Dashboard always refreshes every second (for live countdowns)
  if (currentView === 'dashboard' && mainContainer) {
    currentState = newState;
    renderDashboard(mainContainer, currentState);
  }

  // Groups, bracket, stats, teams and player views refresh every tick while matches are live,
  // and once more on the tick they end so the final result appears immediately.
  const liveRendered = mainContainer && (hasLiveMatches || matchesJustEnded) &&
    (currentView === 'groups' || currentView === 'bracket' ||
     currentView === 'stats' || currentView === 'teams' || currentView === 'player');
  if (liveRendered) {
    currentState = newState;
    switch (currentView) {
      case 'groups':  renderGroups(mainContainer, currentState);              break;
      case 'bracket': renderBracket(mainContainer, currentState);             break;
      case 'stats':   renderStats(mainContainer, currentState);               break;
      case 'teams':
      case 'player':  renderTeams(mainContainer, currentState, currentParams); break;
    }
  }

  if (!minuteChanged && !phaseChanged && !editionChanged) return;

  currentState = newState;
  lastEdition = newState.edition;
  lastPhase = newState.phase.phase;
  lastMinute = newState.cycleMinute;

  updateHeader(currentState);
  updateNav();

  // Re-render non-dashboard views on phase/minute change, unless already refreshed above
  if (currentView !== 'dashboard' && !liveRendered) {
    switch (currentView) {
      case 'groups':  renderGroups(mainContainer, currentState);  break;
      case 'bracket': renderBracket(mainContainer, currentState); break;
      case 'stats':   renderStats(mainContainer, currentState);   break;
    }
  }
}, 1000);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickInterval) clearInterval(tickInterval);
  });
}
