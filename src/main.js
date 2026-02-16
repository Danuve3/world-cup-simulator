import './styles/main.css';
import { createAppShell, updateHeader, updateNav } from './ui/app.js';
import { route, initRouter } from './ui/router.js';
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
initRouter(mainContainer);

let lastEdition = currentState.edition;
let lastPhase = currentState.phase.phase;
let lastMinute = currentState.cycleMinute;

tickInterval = setInterval(() => {
  const newState = getCurrentState();

  const phaseChanged = newState.phase.phase !== lastPhase;
  const minuteChanged = newState.cycleMinute !== lastMinute;
  const editionChanged = newState.edition !== lastEdition;

  // Dashboard always refreshes every second (for live countdowns)
  if (currentView === 'dashboard' && mainContainer) {
    currentState = newState;
    renderDashboard(mainContainer, currentState);
  }

  if (!minuteChanged && !phaseChanged && !editionChanged) return;

  currentState = newState;
  lastEdition = newState.edition;
  lastPhase = newState.phase.phase;
  lastMinute = newState.cycleMinute;

  updateHeader(currentState);
  updateNav();

  if (phaseChanged && currentView !== 'dashboard') {
    switch (currentView) {
      case 'groups':
        renderGroups(mainContainer, currentState);
        break;
      case 'bracket':
        renderBracket(mainContainer, currentState);
        break;
    }
  }
}, 1000);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickInterval) clearInterval(tickInterval);
  });
}
