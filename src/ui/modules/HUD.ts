import { gameStore } from '../../state/GameStore';
import { audioManager } from '../../managers/AudioManager';
import { openSettingsPanel } from './SettingsUI';
import { createScanlines, setupGlobalClickEffects } from '../utils/UIUtils';

export function setupHUD(hudContainer: HTMLElement, modalContainer: HTMLElement) {
  hudContainer.className = 'absolute top-0 left-0 w-full pointer-events-none flex flex-col z-50';
  hudContainer.innerHTML = `
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-cp-yellow pb-2 mb-0 bg-cp-black/70 -skew-x-[10deg] border-l-[10px] border-l-cp-cyan pointer-events-auto px-4 py-2 transition-all duration-300">
        <div id="gang-name-header" class="text-xl md:text-2xl font-black text-cp-cyan ml-2 md:ml-5 skew-x-[10deg] drop-shadow-[2px_2px_var(--cp-red)] font-cyber mb-2 md:mb-0">
          ${gameStore.get().gangName.toUpperCase()}
        </div>
        <div id="resources" class="flex flex-wrap gap-3 md:gap-10 mr-2 md:mr-5 skew-x-[10deg] items-center">
          <div class="text-sm md:text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            EDDIES: <span id="hud-eddies" class="text-white ml-2">0</span>
          </div>
          <div class="text-sm md:text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            REP: <span id="hud-rep" class="text-white ml-2">0</span>
          </div>
          <div class="text-sm md:text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            MEMBERS: <span id="hud-members" class="text-white ml-2">0</span>
          </div>
          <div class="flex gap-2 ml-auto md:ml-0">
            <button id="settings-btn" class="cyber-btn text-xs" title="Settings">⚙</button>
            <button id="tutorial-btn" class="cyber-btn text-xs" title="Show Tutorial">?</button>
          </div>
        </div>
      </header>
      <div id="active-ops-panel" class="absolute top-20 right-4 w-64 flex flex-col gap-2 pointer-events-auto transition-all duration-300"></div>
    `;

  // Start Active Ops Ticker
  setInterval(() => updateActiveOpsPanel(hudContainer), 1000);

  // Add tutorial button listener
  setTimeout(() => {
    document.getElementById('tutorial-btn')?.addEventListener('click', () => {
      audioManager.playClick();
      (window as any).showTutorial?.();
    });

    // Add settings button listener
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      audioManager.playClick();
      openSettingsPanel(modalContainer);
    });
  }, 100);

  // Setup global effects
  createScanlines(hudContainer);
  setupGlobalClickEffects();
}

export function updateActiveOpsPanel(hudContainer: HTMLElement) {
  const panel = hudContainer.querySelector('#active-ops-panel');
  if (!panel) return;

  const state = gameStore.get();
  const activeMissions = state.activeMissions;

  panel.innerHTML = '';

  if (activeMissions.length === 0) {
    panel.classList.add('opacity-0');
    return;
  }

  panel.classList.remove('opacity-0');

  activeMissions.forEach(active => {
    const mission = active.mission;
    const endTime = active.endTime;
    const remaining = Math.max(0, endTime - Date.now());
    const progress = 1 - (remaining / mission.duration);

    const el = document.createElement('div');
    el.className = 'bg-black/80 border-l-4 border-cp-cyan p-2 text-xs font-cyber shadow-[0_0_10px_rgba(0,0,0,0.5)]';
    el.innerHTML = `
            <div class="flex justify-between text-white mb-1">
                <span>${mission.name}</span>
                <span class="text-cp-cyan">${Math.ceil(remaining / 1000)}s</span>
            </div>
            <div class="w-full h-1 bg-gray-800">
                <div class="h-full bg-cp-cyan" style="width: ${progress * 100}%"></div>
            </div>
        `;
    panel.appendChild(el);
  });
}

export function startFlavorTextRotation() {
  const texts = [
    "INITIALIZING...",
    "CONNECTING TO NET...",
    "SCANNING FOR RIVALS...",
    "POLICE SCANNER: ACTIVE",
    "WEATHER: ACID RAIN",
    "MARKET: EDDIES UP",
    "SYSTEM: SECURE",
    "GANG: REPUTATION STABLE",
    "INCOMING TRANSMISSION...",
    "NETWORK: 5G UNSTABLE"
  ];

  const el = document.getElementById('flavor-text');
  if (!el) return;

  let index = 0;

  const updateText = () => {
    el.style.opacity = '0';
    setTimeout(() => {
      index = (index + 1) % texts.length;
      el.textContent = texts[index];
      el.style.opacity = '1';
    }, 500);
  };

  setInterval(updateText, 5000);
}

export function updateHUDResources(state: any) {
  const eddiesEl = document.getElementById('hud-eddies');
  const repEl = document.getElementById('hud-rep');
  const membersEl = document.getElementById('hud-members');

  if (eddiesEl) eddiesEl.textContent = state.eddies.toLocaleString();
  if (repEl) repEl.textContent = state.rep.toLocaleString();
  if (membersEl) membersEl.textContent = state.members.length.toString();
}
