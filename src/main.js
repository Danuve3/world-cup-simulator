import './styles/main.css';
import { createAppShell, updateHeader, updateNav } from './ui/app.js';
import { route, initRouter, setOnRouteChange } from './ui/router.js';
import { getCurrentState } from './engine/simulation.js';
import { renderDashboard } from './ui/views/dashboard.js';
import { renderGroups } from './ui/views/groups.js';
import { renderBracket } from './ui/views/bracket.js';
import { renderHistory } from './ui/views/history.js';
import { renderStats } from './ui/views/stats.js';

let currentState = null;
let mainContainer = null;
let tickInterval = null;
let currentView = null;

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

route('/history', (container) => {
  currentView = 'history';
  renderHistory(container, currentState);
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
  const newState = getCurrentState();

  const phaseChanged = newState.phase.phase !== lastPhase;
  const minuteChanged = newState.cycleMinute !== lastMinute;
  const editionChanged = newState.edition !== lastEdition;
  const hasLiveMatches = newState.liveMatches && newState.liveMatches.length > 0;

  // Dashboard always refreshes every second (for live countdowns)
  if (currentView === 'dashboard' && mainContainer) {
    currentState = newState;
    renderDashboard(mainContainer, currentState);
  }

  // Groups and stats refresh every tick when there are live matches
  const liveRendered = hasLiveMatches && mainContainer && (currentView === 'groups' || currentView === 'stats');
  if (liveRendered) {
    currentState = newState;
    if (currentView === 'groups') renderGroups(mainContainer, currentState);
    else renderStats(mainContainer, currentState);
  }

  if (!minuteChanged && !phaseChanged && !editionChanged) return;

  currentState = newState;
  lastEdition = newState.edition;
  lastPhase = newState.phase.phase;
  lastMinute = newState.cycleMinute;

  updateHeader(currentState);
  updateNav();

  if ((phaseChanged || minuteChanged) && currentView !== 'dashboard' && !liveRendered) {
    switch (currentView) {
      case 'groups':
        renderGroups(mainContainer, currentState);
        break;
      case 'bracket':
        renderBracket(mainContainer, currentState);
        break;
      case 'stats':
        renderStats(mainContainer, currentState);
        break;
    }
  } else if ((phaseChanged || minuteChanged) && currentView === 'bracket') {
    renderBracket(mainContainer, currentState);
  }
}, 1000);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickInterval) clearInterval(tickInterval);
  });
}
