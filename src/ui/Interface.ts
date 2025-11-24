import { gameStore, startMission, refreshMissions, Mission, addEddies, recruitMember, healMember, upgradeMember, rivalGangManager, attackTerritory, RIDER_CLASSES, removeEncounter } from '@/state/GameStore';
import { AsciiGenerator } from '@/utils/AsciiGenerator';
import { audioManager } from '../managers/AudioManager';
import { saveManager } from '@/managers/SaveManager';
import { encounterManager } from '@/managers/EncounterManager';
import { ENCOUNTERS } from '@/data/Encounters';

export class Interface {
  private container: HTMLElement;
  private hudContainer: HTMLElement;
  private modalContainer: HTMLElement;
  private activeTab: string = 'missions';
  private lastActiveMissions: any[] = [];
  private lastAvailableMissions: any[] = [];
  private lastTerritories: any[] = [];
  private flavorTexts: string[] = [
    "WARNING: RELIC MALFUNCTION DETECTED",
    "DON'T FORGET TO FEED YOUR CAT",
    "HANAKO IS STILL WAITING AT EMBERS",
    "NCPD WARRANT ISSUED: JAYWALKING",
    "TRAUMA TEAM MEMBERSHIP EXPIRED",
    "WAKE THE F*** UP, SAMURAI",
    "KIROSHI OPTICS FIRMWARE UPDATE AVAILABLE",
    "WEATHER UPDATE: ACID RAIN EXPECTED IN PACIFICA",
    "MAXTAC DEPLOYED TO CITY CENTER",
    "REMEMBER: STYLE OVER SUBSTANCE",
    "NETWATCH IS WATCHING YOU",
    "DELAMAIN: EXCUSE ME, BEEP BEEP"
  ];


  constructor() {
    this.container = document.getElementById('ui-layer')!;
    this.hudContainer = document.createElement('div');
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'pointer-events-none';

    this.container.appendChild(this.hudContainer);
    this.container.appendChild(this.modalContainer);

    this.setupHUD();

    this.setupListeners();
    this.setupStoreSubscription();
    this.startFlavorTextRotation();
  }

  private setupHUD() {
    this.hudContainer.className = 'absolute top-0 left-0 w-full pointer-events-none flex flex-col z-50';
    this.hudContainer.innerHTML = `
      <header class="flex justify-between items-center border-b-2 border-cp-yellow pb-2 mb-0 bg-cp-black/70 -skew-x-[10deg] border-l-[10px] border-l-cp-cyan pointer-events-auto px-4 py-2">
        <div class="text-2xl font-black text-cp-cyan ml-5 skew-x-[10deg] drop-shadow-[2px_2px_var(--cp-red)] font-cyber">
          NEON REIGN
        </div>
        <div id="resources" class="flex gap-10 mr-5 skew-x-[10deg]">
          <div class="text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            EDDIES: <span id="hud-eddies" class="text-white ml-2">0</span>
          </div>
          <div class="text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            REP: <span id="hud-rep" class="text-white ml-2">0</span>
          </div>
          <div class="text-xl font-bold text-cp-yellow uppercase flex items-center font-cyber">
            MEMBERS: <span id="hud-members" class="text-white ml-2">0</span>
          </div>
          <button id="settings-btn" class="cyber-btn text-xs ml-2" title="Settings">⚙</button>
          <button id="tutorial-btn" class="cyber-btn text-xs" title="Show Tutorial">?</button>
        </div>
      </header>
    `;

    // Add tutorial button listener
    setTimeout(() => {
      document.getElementById('tutorial-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        (window as any).showTutorial?.();
      });

      // Add settings button listener
      document.getElementById('settings-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        this.openSettingsPanel();
      });
    }, 100);
  }

  private openSettingsPanel() {
    const settingsOverlay = document.getElementById('settings-overlay');
    if (!settingsOverlay) return;

    // Show overlay
    settingsOverlay.classList.remove('tutorial-hidden');
    audioManager.playPanelOpen();

    // Load current settings
    const musicVolumeSlider = document.getElementById('music-volume') as HTMLInputElement;
    const sfxVolumeSlider = document.getElementById('sfx-volume') as HTMLInputElement;
    const musicToggle = document.getElementById('music-toggle') as HTMLInputElement;
    const sfxToggle = document.getElementById('sfx-toggle') as HTMLInputElement;
    const musicVolumeValue = document.getElementById('music-volume-value');
    const sfxVolumeValue = document.getElementById('sfx-volume-value');

    if (musicVolumeSlider) {
      musicVolumeSlider.value = audioManager.getMusicVolume().toString();
      if (musicVolumeValue) musicVolumeValue.textContent = `${audioManager.getMusicVolume()}%`;
    }
    if (sfxVolumeSlider) {
      sfxVolumeSlider.value = audioManager.getSfxVolume().toString();
      if (sfxVolumeValue) sfxVolumeValue.textContent = `${audioManager.getSfxVolume()}%`;
    }
    if (musicToggle) musicToggle.checked = audioManager.isMusicEnabled();
    if (sfxToggle) sfxToggle.checked = audioManager.isSfxEnabled();

    // Setup event listeners (one-time setup)
    if (!(settingsOverlay as any)._listenersAdded) {
      (settingsOverlay as any)._listenersAdded = true;

      // Close button
      document.getElementById('settings-close-btn')?.addEventListener('click', () => {
        audioManager.playPanelClose();
        settingsOverlay.classList.add('tutorial-hidden');
      });

      // Music volume slider
      musicVolumeSlider?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        audioManager.setMusicVolume(value);
        if (musicVolumeValue) musicVolumeValue.textContent = `${value}%`;
        this.saveSettings();
      });

      // SFX volume slider
      sfxVolumeSlider?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        audioManager.setSfxVolume(value);
        if (sfxVolumeValue) sfxVolumeValue.textContent = `${value}%`;
        audioManager.playClick();
        this.saveSettings();
      });

      // Music toggle
      musicToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        audioManager.setMusicEnabled(enabled);
        audioManager.playClick();
        this.saveSettings();
      });

      // SFX toggle
      sfxToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        audioManager.setSfxEnabled(enabled);
        if (enabled) audioManager.playClick();
        this.saveSettings();
      });

      // Reset progress button - shows confirmation modal on click
      const resetBtn = document.getElementById('reset-progress-btn');

      resetBtn?.addEventListener('click', () => {
        audioManager.playError();

        // Show custom confirmation modal
        this.showResetConfirmationModal(() => {
          audioManager.playError();
          this.resetGame();
          settingsOverlay.classList.add('tutorial-hidden');
          this.showToast('GAME RESET COMPLETE', 'success');
        });
      });
    }
  }

  private saveSettings() {
    saveManager.saveSettings({
      musicVolume: audioManager.getMusicVolume(),
      sfxVolume: audioManager.getSfxVolume(),
      musicEnabled: audioManager.isMusicEnabled(),
      sfxEnabled: audioManager.isSfxEnabled()
    });
  }

  private resetGame() {
    // Use forceReset which prevents save-on-unload and clears everything
    saveManager.forceReset();

    console.log('[Interface] Game reset complete, reloading...');

    // Reload page to reset to initial state
    window.location.reload();
  }

  private showResetConfirmationModal(onConfirm: () => void) {
    const overlay = this.createOverlay();
    // Increase z-index to appear above settings panel
    overlay.style.zIndex = '100000';
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-red shadow-[0_0_60px_rgba(255,0,0,0.8)] w-[90%] max-w-[500px] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-red/20 border-b-2 border-cp-red p-5">
        <h2 class="text-cp-red m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-red)] font-cyber font-bold uppercase text-center animate-pulse">⚠ WARNING ⚠</h2>
      </div>
      
      <div class="p-6">
        <p class="text-white text-lg mb-6 font-cyber leading-relaxed border-l-4 border-cp-red pl-4 bg-black/30 p-4">
          This will <span class="text-cp-red font-bold">PERMANENTLY DELETE</span> all your progress, including:
        </p>
        
        <ul class="text-gray-300 mb-6 space-y-2 font-cyber ml-4">
          <li>• All gang members and upgrades</li>
          <li>• All eddies and reputation</li>
          <li>• All territories and completed missions</li>
          <li>• All game settings</li>
        </ul>

        <p class="text-cp-yellow text-base font-cyber text-center font-bold mb-4 animate-pulse">
          ARE YOU ABSOLUTELY SURE?
        </p>
      </div>

      <div class="border-t-2 border-cp-red p-5 flex gap-3">
        <button id="cancel-reset" class="cyber-btn flex-1 py-3 text-lg bg-gray-700 hover:bg-gray-600">CANCEL</button>
        <button id="confirm-reset" class="cyber-btn flex-1 py-3 text-lg bg-cp-red/80 hover:bg-cp-red text-white animate-pulse">DELETE EVERYTHING</button>
      </div>
    `;

    overlay.appendChild(modal);
    // Append to document body to ensure it's above everything
    document.body.appendChild(overlay);

    modal.querySelector('#cancel-reset')?.addEventListener('click', () => {
      audioManager.playClick();
      overlay.remove();
    });

    modal.querySelector('#confirm-reset')?.addEventListener('click', () => {
      audioManager.playClick();
      overlay.remove();
      onConfirm();
    });
  }



  private startFlavorTextRotation() {
    const textEl = document.getElementById('flavor-text');
    if (!textEl) return;

    const updateText = () => {
      // Fade out
      textEl.style.opacity = '0';

      setTimeout(() => {
        // Change text
        const randomText = this.flavorTexts[Math.floor(Math.random() * this.flavorTexts.length)];
        textEl.textContent = randomText;

        // Glitch effect classes
        textEl.classList.add('glitch-text');

        // Fade in
        textEl.style.opacity = '1';

        setTimeout(() => {
          textEl.classList.remove('glitch-text');
        }, 500);
      }, 500);
    };

    // Initial text
    updateText();

    // Rotate every 8 seconds
    setInterval(updateText, 8000);
  }

  private setupListeners() {
    window.addEventListener('building-click', (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail.type;

      if (type === 'hideout') {
        this.openMissionBoard();
      } else if (type === 'bar') {
        this.openAfterlife();
      } else if (type === 'ripperdoc') {
        this.openRipperdoc();
      }
    });

    window.addEventListener('mission-complete', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.showMissionReward(detail);
    });

    // Start music on first interaction
    const startAudio = () => {
      audioManager.startBackgroundMusic();
      document.removeEventListener('click', startAudio);
    };
    document.addEventListener('click', startAudio);


  }

  private setupStoreSubscription() {
    gameStore.subscribe(state => {
      const eddiesEl = document.getElementById('hud-eddies');
      const repEl = document.getElementById('hud-rep');
      const membersEl = document.getElementById('hud-members');

      if (eddiesEl) {
        eddiesEl.textContent = state.eddies.toLocaleString();
        eddiesEl.parentElement?.classList.remove('animate-pulse-cyber');
        void eddiesEl.offsetWidth; // trigger reflow
        eddiesEl.parentElement?.classList.add('animate-pulse-cyber');
      }
      if (repEl) repEl.textContent = state.rep.toLocaleString();
      if (membersEl) membersEl.textContent = state.members.length.toString();

      // Update Mission Board if open and on missions tab
      const tabContent = document.getElementById('tab-content');
      if (tabContent) {
        if (this.activeTab === 'missions') {
          // Check if we need to re-render (simple reference check)
          if (state.activeMissions !== this.lastActiveMissions || state.availableMissions !== this.lastAvailableMissions) {
            this.lastActiveMissions = state.activeMissions;
            this.lastAvailableMissions = state.availableMissions;
            this.renderMissionsTab(tabContent);
          }
        } else if (this.activeTab === 'territories' || this.activeTab === 'gangs') {
          if (state.territories !== this.lastTerritories) {
            this.lastTerritories = state.territories;
            if (this.activeTab === 'territories') this.renderTerritoryTab(tabContent);
            if (this.activeTab === 'gangs') this.renderGangsTab(tabContent);
          }
        }
      }

      // Render Active Encounters
      this.renderEncounters(state.activeEncounters);
    });
  }

  private renderEncounters(encounters: { id: string; encounterId: string; x: number; y: number }[]) {
    // Remove old encounters
    const existing = document.querySelectorAll('.encounter-marker');
    existing.forEach(el => {
      if (!encounters.find(e => e.id === (el as HTMLElement).dataset.id)) {
        el.remove();
      }
    });

    // Add new encounters
    encounters.forEach(encounter => {
      if (!document.querySelector(`.encounter-marker[data-id="${encounter.id}"]`)) {
        // Play alert sound
        audioManager.playAlert();

        const el = document.createElement('div');
        // Added pointer-events-auto to ensure it catches clicks even if parent is pointer-events-none
        el.className = 'encounter-marker absolute w-16 h-16 flex items-center justify-center cursor-pointer z-[60] pointer-events-auto group';
        el.style.left = `${encounter.x}%`;
        el.style.top = `${encounter.y}%`;
        el.dataset.id = encounter.id;

        // Improved visuals: Diamond shape, pulsing ring, better colors
        el.innerHTML = `
                <div class="absolute inset-0 bg-cp-yellow/30 rounded-full animate-ping"></div>
                <div class="absolute inset-0 bg-cp-red/20 rotate-45 border-2 border-cp-yellow shadow-[0_0_15px_var(--cp-yellow)] transition-transform group-hover:scale-110 bg-black/80"></div>
                <div class="relative text-cp-yellow text-4xl font-bold drop-shadow-[0_0_5px_var(--cp-red)] animate-pulse">!</div>
                <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-cp-yellow text-cp-yellow text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-cyber tracking-wider">
                    SIGNAL DETECTED
                </div>
            `;

        el.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent clicking through
          audioManager.playClick();
          this.openEncounterModal(encounter.id, encounter.encounterId);
        });

        this.container.appendChild(el);
      }
    });
  }

  private openEncounterModal(instanceId: string, encounterId: string) {
    const encounter = ENCOUNTERS.find(e => e.id === encounterId);
    if (!encounter) return;

    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-red shadow-[0_0_40px_rgba(255,0,0,0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto relative';

    modal.innerHTML = `
        <div class="bg-cp-red/20 border-b-2 border-cp-red p-5 flex justify-between items-center shrink-0">
            <h2 class="text-cp-red m-0 text-2xl drop-shadow-[0_0_10px_var(--cp-red)] font-cyber font-bold uppercase">${encounter.title}</h2>
            <button id="close-encounter" class="bg-transparent border-2 border-cp-red text-cp-red text-2xl w-8 h-8 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
        </div>
        
        <div class="p-6">
            <p class="text-white text-lg mb-6 font-cyber leading-relaxed border-l-4 border-cp-yellow pl-4 bg-black/30 p-4">
                "${encounter.description}"
            </p>

            <div class="space-y-3">
                ${encounter.options.map((opt, idx) => `
                    <button class="encounter-opt-btn w-full text-left p-4 border-2 border-gray-600 hover:border-cp-yellow hover:bg-cp-yellow/10 transition-all group relative overflow-hidden" data-index="${idx}">
                        <div class="font-bold text-cp-yellow text-lg group-hover:translate-x-2 transition-transform">${opt.text}</div>
                        ${opt.skillCheck ? `<div class="text-xs text-cp-cyan mt-1">CHECK: ${opt.skillCheck.stat.toUpperCase()} ${opt.skillCheck.difficulty}+</div>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>
      `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-encounter')?.addEventListener('click', () => overlay.remove());

    modal.querySelectorAll('.encounter-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.index!);
        const result = encounterManager.resolveEncounter(encounterId, idx);

        // Remove encounter from world
        removeEncounter(instanceId);

        // Show result with detailed effects
        overlay.remove();
        this.showEncounterResult(result.message, result.success, result.effects);
      });
    });
  }

  private showEncounterResult(message: string, success: boolean, effects?: {
    cost?: number;
    rewards?: { eddies?: number; xp?: number; rep?: number; health?: number; targetName?: string };
    penalties?: { eddies?: number; health?: number; rep?: number; targetName?: string };
  }) {
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    const color = success ? 'cp-cyan' : 'cp-red';

    modal.className = `bg-cp-bg border-[3px] border-${color} shadow-[0_0_40px_rgba(${success ? '0,240,255' : '255,0,0'},0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto`;

    // Build effects display
    let effectsHtml = '';

    if (effects) {
      const effectsList: string[] = [];

      // Cost
      if (effects.cost) {
        effectsList.push(`<div class="flex items-center gap-2 text-cp-red"><span class="text-2xl">💸</span> <span>-${effects.cost}€ COST</span></div>`);
      }

      // Rewards
      if (effects.rewards) {
        if (effects.rewards.eddies) {
          effectsList.push(`<div class="flex items-center gap-2 text-cp-yellow"><span class="text-2xl">💰</span> <span>+${effects.rewards.eddies}€ EDDIES</span></div>`);
        }
        if (effects.rewards.xp) {
          effectsList.push(`<div class="flex items-center gap-2 text-cp-cyan"><span class="text-2xl">⭐</span> <span>+${effects.rewards.xp} XP</span></div>`);
        }
        if (effects.rewards.rep) {
          effectsList.push(`<div class="flex items-center gap-2 text-green-400"><span class="text-2xl">🏆</span> <span>+${effects.rewards.rep} REP</span></div>`);
        }
        if (effects.rewards.health) {
          const target = effects.rewards.targetName ? ` (${effects.rewards.targetName})` : '';
          effectsList.push(`<div class="flex items-center gap-2 text-green-500"><span class="text-2xl">❤️</span> <span>+${effects.rewards.health} HP${target}</span></div>`);
        }
      }

      // Penalties
      if (effects.penalties) {
        if (effects.penalties.eddies) {
          effectsList.push(`<div class="flex items-center gap-2 text-orange-500"><span class="text-2xl">💸</span> <span>-${effects.penalties.eddies}€ LOST</span></div>`);
        }
        if (effects.penalties.rep) {
          effectsList.push(`<div class="flex items-center gap-2 text-orange-500"><span class="text-2xl">📉</span> <span>${effects.penalties.rep} REP</span></div>`);
        }
        if (effects.penalties.health) {
          const target = effects.penalties.targetName ? ` (${effects.penalties.targetName})` : '';
          effectsList.push(`<div class="flex items-center gap-2 text-cp-red"><span class="text-2xl">💔</span> <span>-${effects.penalties.health} HP DAMAGE${target}</span></div>`);
        }
      }

      if (effectsList.length > 0) {
        effectsHtml = `
          <div class="bg-black/40 border-t-2 border-${color}/30 p-4 mt-4">
            <h3 class="text-cp-yellow font-bold font-cyber text-sm mb-3 uppercase tracking-wider">Effects Applied:</h3>
            <div class="space-y-2 text-base font-cyber">
              ${effectsList.join('')}
            </div>
          </div>
        `;
      }
    }

    modal.innerHTML = `
        <div class="bg-${color}/10 border-b-2 border-${color} p-5">
          <h2 class="text-${color} text-3xl font-bold font-cyber text-center drop-shadow-[0_0_10px_var(--${color})]">
            ${success ? '✓ SUCCESS' : '✗ FAILURE'}
          </h2>
        </div>
        <div class="p-6">
          <p class="text-white text-lg mb-4 font-cyber leading-relaxed border-l-4 border-${color} pl-4 bg-black/30 p-4">"${message}"</p>
          ${effectsHtml}
        </div>
        <div class="border-t-2 border-${color} p-5">
          <button id="close-result" class="cyber-btn w-full py-3 text-xl">CLOSE</button>
        </div>
      `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-result')?.addEventListener('click', () => {
      audioManager.playClick();
      overlay.remove();
    });
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 flex justify-center items-center z-[10001] animate-[fadeIn_0.3s] pointer-events-auto';

    // Stop propagation of pointer events to prevent clicking through to the game
    const stopEvent = (e: Event) => e.stopPropagation();
    overlay.addEventListener('pointerdown', stopEvent);
    overlay.addEventListener('mousedown', stopEvent);
    overlay.addEventListener('touchstart', stopEvent);
    overlay.addEventListener('click', stopEvent);

    return overlay;
  }



  private openMissionBoard() {
    this.modalContainer.innerHTML = '';
    const overlay = this.createOverlay();

    // Prevent clicks from passing through to underlying elements
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[1000px] h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">HIDEOUT</h2>
        <button id="close-modal" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>
      
      <!-- Tabs -->
      <div class="flex gap-2 p-4 bg-black/30 border-b border-cp-yellow/30">
        <button class="cyber-btn tab-btn active" data-tab="missions">MISSIONS</button>
        <button class="cyber-btn tab-btn" data-tab="roster">ROSTER</button>
        <button class="cyber-btn tab-btn" data-tab="territory">TERRITORY</button>
        <button class="cyber-btn tab-btn" data-tab="gangs">GANGS</button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-5" id="tab-content"></div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    const tabContent = modal.querySelector('#tab-content')!;
    this.activeTab = 'missions';

    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        audioManager.playClick();
        this.renderTabContent(tabContent, this.activeTab);
      });
    });

    // Close button
    modal.querySelector('#close-modal')?.addEventListener('click', () => overlay.remove());

    // Render initial tab
    this.renderTabContent(tabContent, this.activeTab);
  }

  private renderTabContent(container: Element, tab: string) {
    container.innerHTML = '';

    if (tab === 'missions') {
      this.renderMissionsTab(container);
    } else if (tab === 'roster') {
      this.renderRosterTab(container);
    } else if (tab === 'territory') {
      this.renderTerritoryTab(container);
    } else if (tab === 'gangs') {
      this.renderGangsTab(container);
    }
  }

  private renderMissionsTab(container: Element) {
    const state = gameStore.get();
    container.innerHTML = '';

    // --- Active Missions Section ---
    if (state.activeMissions.length > 0) {
      const activeHeader = document.createElement('h3');
      activeHeader.className = 'text-cp-cyan font-cyber text-xl mb-3 mt-2';
      activeHeader.textContent = 'ACTIVE MISSIONS';
      container.appendChild(activeHeader);

      state.activeMissions.forEach(activeMission => {
        const members = state.members.filter(m => activeMission.memberIds.includes(m.id));
        if (members.length === 0) return;

        const mission = activeMission.mission;
        const startTime = activeMission.startTime;
        const duration = mission.duration;

        const card = document.createElement('div');
        card.className = 'bg-black/60 border-2 border-cp-cyan p-4 mb-3 animate-pulse';


        const teamLabel = members.length > 1 ? `TEAM (${members.length})` : members[0].name;

        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold text-white font-cyber text-lg">${mission.name}</div>
              <div class="text-cp-cyan text-sm font-cyber">[${mission.type}]</div>
            </div>
            <div class="text-right">
              <div class="text-cp-yellow font-bold font-cyber">${teamLabel}</div>
              <div class="text-gray-400 text-xs truncate max-w-[150px]">
                ${members.map(m => `<span class="text-[10px] bg-cp-cyan/20 px-1 mr-1">${m.class.substring(0, 3)}</span>${m.name}`).join(', ')}
              </div>
            </div>
          </div>
          
          <div class="w-full h-4 bg-gray-800 border border-cp-cyan mt-2 relative overflow-hidden">
            <div class="h-full bg-cp-cyan transition-all duration-1000 ease-linear mission-progress" style="width: 0%" id="progress-${activeMission.id}"></div>
          </div>
          <div class="text-right text-cp-cyan font-mono text-sm mt-1 mission-timer" id="timer-${activeMission.id}">CALCULATING...</div>
        `;

        container.appendChild(card);

        // Timer Logic
        const updateTimer = () => {
          if (!document.body.contains(card)) return; // Stop if removed from DOM

          const now = Date.now();
          const elapsed = now - startTime;
          const remaining = Math.max(0, duration - elapsed);
          const progress = Math.min(100, (elapsed / duration) * 100);

          const progressEl = card.querySelector('.mission-progress') as HTMLElement;
          const timerEl = card.querySelector('.mission-timer') as HTMLElement;

          if (progressEl) progressEl.style.width = `${progress}%`;
          if (timerEl) timerEl.textContent = `${(remaining / 1000).toFixed(1)}s remaining`;

          if (remaining > 0) {
            requestAnimationFrame(updateTimer);
          } else {
            // Mission complete handled by GameStore/GameManager logic, UI update via event
            if (timerEl) timerEl.textContent = 'COMPLETED';
            card.classList.remove('animate-pulse');
            card.classList.add('border-green-500');
          }
        };

        requestAnimationFrame(updateTimer);
      });

      const divider = document.createElement('hr');
      divider.className = 'border-gray-700 my-6';
      container.appendChild(divider);
    }

    // --- Available Missions Section ---
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    header.innerHTML = '<h3 class="text-cp-yellow font-cyber text-xl">AVAILABLE MISSIONS</h3>';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'cyber-btn small-btn text-xs px-3 py-1';
    refreshBtn.textContent = 'REFRESH (50€)';
    refreshBtn.addEventListener('click', () => {
      audioManager.playClick();
      if (refreshMissions()) {
        this.showToast('MISSIONS REFRESHED', 'success');
        this.renderMissionsTab(container);
      } else {
        this.showToast('INSUFFICIENT FUNDS', 'error');
      }
    });
    header.appendChild(refreshBtn);
    container.appendChild(header);

    if (state.availableMissions.length === 0) {
      container.innerHTML += '<div class="text-center text-gray-500 font-cyber py-8 text-xl">NO MISSIONS AVAILABLE</div>';
      return;
    }

    state.availableMissions.forEach(mission => {
      const card = document.createElement('div');
      card.className = 'bg-black/60 border-2 border-cp-yellow p-4 mb-3 cursor-pointer transition-all duration-300 hover:border-cp-cyan hover:translate-x-2 hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:bg-cp-cyan/5 animate-slideIn opacity-0 fill-mode-forwards';

      const difficultyColor = {
        'EASY': 'text-green-400',
        'MEDIUM': 'text-yellow-400',
        'HARD': 'text-orange-400',
        'EXTREME': 'text-cp-red'
      }[mission.difficulty];

      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-white font-cyber text-lg">${mission.name}</h3>
          <span class="text-xs font-bold ${difficultyColor} border border-current px-2 py-1">${mission.difficulty}</span>
        </div>
        <div class="text-cp-yellow text-sm mb-2 font-cyber">${mission.type}</div>
        <p class="text-gray-400 text-xs mb-3 h-10 overflow-hidden font-cyber">${mission.description}</p>
        <div class="flex gap-5 text-sm text-gray-400 font-cyber">
          <span class="group-hover:text-cp-cyan transition-colors">💰 ${mission.eddiesMin}-${mission.eddiesMax}€</span>
          <span class="group-hover:text-cp-cyan transition-colors">⭐ ${mission.xpMin}-${mission.xpMax} XP</span>
          <span class="group-hover:text-cp-cyan transition-colors">⏱ ${mission.duration / 1000}s</span>
        </div>
      `;

      card.addEventListener('click', () => {
        audioManager.playPanelOpen();
        this.openMissionDetail(mission);
      });

      container.appendChild(card);
    });
  }

  private openMissionDetail(mission: Mission) {
    const overlay = this.createOverlay();

    // Prevent clicks from passing through
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[1000px] h-[90vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">${mission.name}</h2>
        <button id="close-detail" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 overflow-y-auto flex-1">
        <!-- Left Column: Details & Stats -->
        <!-- Left Column: Details & Stats -->
        <div class="border-r border-cp-cyan pr-5 flex flex-col gap-2 overflow-hidden">
          <div class="shrink-0">
            <div class="flex justify-between items-center mb-1">
              <span class="inline-block px-3 py-1 text-lg font-bold rounded bg-cp-black border border-cp-yellow text-cp-yellow">
                ${mission.difficulty}
              </span>
              <div class="text-cp-yellow text-base font-cyber">${mission.type}</div>
            </div>
            
            <div class="text-white text-sm leading-snug mb-2 p-2 bg-black/30 border-l-[3px] border-cp-yellow italic font-cyber">
              "${mission.description}"
            </div>
          </div>

          <!-- Mission Stats Grid -->
          <div class="grid grid-cols-2 gap-2 shrink-0">
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex justify-between items-center">
              <div class="text-cp-cyan text-xs font-bold">REWARD</div>
              <div class="text-white text-base font-cyber">${mission.eddiesMin}-${mission.eddiesMax}€</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex justify-between items-center">
              <div class="text-cp-cyan text-xs font-bold">XP</div>
              <div class="text-white text-base font-cyber">${mission.xpMin}-${mission.xpMax}</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex justify-between items-center">
              <div class="text-cp-cyan text-xs font-bold">TIME</div>
              <div class="text-white text-base font-cyber">${mission.duration / 1000}s</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex justify-between items-center">
              <div class="text-cp-cyan text-xs font-bold">RISK</div>
              <div class="text-white text-base font-cyber">${Math.round(mission.injuryChance * 100)}%</div>
            </div>
          </div>

          <!-- Team Stats & Probability -->
          <div class="bg-black/40 border border-cp-yellow p-3 mt-1 shrink-0">
            <div class="flex justify-between items-center border-b border-cp-yellow/30 pb-1 mb-2">
              <h4 class="text-cp-yellow font-bold font-cyber text-sm">PROJECTIONS</h4>
              <div class="text-xs text-gray-400 font-cyber">
                LVL ${mission.minLevel}+ 
                ${mission.minCool ? `• COOL ${mission.minCool}+` : ''}
                ${mission.minReflex ? `• REF ${mission.minReflex}+` : ''}
              </div>
            </div>
            
            <div class="flex justify-between mb-1 text-xs">
              <span class="text-gray-400">TEAM POWER:</span>
              <span class="text-white font-bold" id="team-power">0</span>
            </div>
            <div class="flex justify-between mb-1 text-xs">
              <span class="text-gray-400">WIN CHANCE:</span>
              <span class="text-cp-cyan font-bold" id="win-chance">0%</span>
            </div>
            <div class="w-full h-1.5 bg-gray-800 mb-2">
              <div id="win-bar" class="h-full bg-cp-cyan transition-all duration-300" style="width: 0%"></div>
            </div>

            <div class="flex justify-between text-xs">
              <span class="text-gray-400">INJURY RISK:</span>
              <span class="text-cp-red font-bold" id="injury-risk">--</span>
            </div>
            
            <div id="active-passives" class="mt-2 border-t border-gray-700 pt-1"></div>
          </div>
        </div>

        <!-- Right Column: Crew Selection -->
        <div class="flex flex-col h-full border-l border-cp-cyan/30 pl-5">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-cp-yellow m-0 font-cyber text-lg font-bold">SELECT CREW</h3>
            <span class="text-[10px] text-gray-400">MAX 3</span>
          </div>
          
          <div id="crew-list" class="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1">
            <!-- Crew members go here -->
          </div>
        </div>
      </div>

      <!-- Biker Animation Section -->
      <div class="w-full h-[100px] bg-black/30 border-t-2 border-cp-yellow relative overflow-hidden shrink-0">
         <div id="biker-anim" class="absolute left-[-150px] bottom-[10px] w-[150px] h-[80px]">
           <img src="assets/biker.png" class="w-full h-full object-contain drop-shadow-[0_0_5px_var(--cp-cyan)]" />
         </div>
      </div>

      <div class="border-t-2 border-cp-cyan p-5 flex justify-between items-center bg-black/30 shrink-0">
        <div class="text-cp-yellow text-xl font-bold font-cyber">
          SELECTED: <span id="selected-count">0</span>/3
        </div>
        <button id="send-crew-btn" class="cyber-btn px-10 py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed">
          SEND CREW
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    let selectedMemberIds: number[] = [];
    const sendBtn = modal.querySelector('#send-crew-btn') as HTMLButtonElement;
    const selectedCountEl = modal.querySelector('#selected-count')!;
    const bikerAnim = modal.querySelector('#biker-anim') as HTMLElement;

    // Stats Elements
    const teamPowerEl = modal.querySelector('#team-power')!;
    const winChanceEl = modal.querySelector('#win-chance')!;
    const winBarEl = modal.querySelector('#win-bar') as HTMLElement;
    const injuryRiskEl = modal.querySelector('#injury-risk')!;

    sendBtn.disabled = true;

    // Update Stats Function
    const updateStats = () => {
      const state = gameStore.get();
      const selectedMembers = state.members.filter(m => selectedMemberIds.includes(m.id));

      if (selectedMembers.length === 0) {
        teamPowerEl.textContent = '0';
        winChanceEl.textContent = '0%';
        winBarEl.style.width = '0%';
        injuryRiskEl.textContent = '--';
        return;
      }

      // Calculate Power
      // New Formula: (Sum of Stats * 2) + (Sum of Levels * 5)
      const teamPower = selectedMembers.reduce((sum, m) => sum + ((m.stats.cool + m.stats.reflex) * 2) + (m.level * 5), 0);
      const difficulty = mission.difficultyRating || 50;
      const chance = Math.min(0.95, Math.max(0.05, teamPower / difficulty));

      // Calculate Risk
      const riskReduction = (selectedMembers.length - 1) * 0.05;
      let baseRisk = Math.max(0.05, mission.injuryChance - riskReduction);

      // UI Prediction: If chance is high (>50%), assume success for risk display
      if (chance > 0.5) {
        baseRisk *= 0.5;
      }

      // Update UI
      teamPowerEl.textContent = teamPower.toString();
      winChanceEl.textContent = `${Math.round(chance * 100)}%`;
      winBarEl.style.width = `${Math.round(chance * 100)}%`;

      // Color code win chance
      if (chance > 0.8) winChanceEl.className = 'text-green-500 font-bold';
      else if (chance > 0.5) winChanceEl.className = 'text-yellow-500 font-bold';
      else winChanceEl.className = 'text-red-500 font-bold';

      injuryRiskEl.textContent = `${Math.round(baseRisk * 100)}%`;

      // Show active passives
      const passivesList = selectedMembers.map(m => {
        const info = RIDER_CLASSES[m.class];
        return `<div class="text-[10px] text-cp-cyan">• ${m.name} (${info.name}): ${info.passive}</div>`;
      }).join('');

      const passiveContainer = modal.querySelector('#active-passives');
      if (passiveContainer) passiveContainer.innerHTML = passivesList;
    };

    // Render Crew
    const crewList = modal.querySelector('#crew-list')!;
    const state = gameStore.get();
    const availableMembers = state.members.filter(m => m.status === 'IDLE' && !m.injured);

    if (availableMembers.length === 0) {
      crewList.innerHTML = '<div class="text-cp-red text-center p-10 font-cyber text-xl">NO AVAILABLE MEMBERS</div>';
    } else {
      availableMembers.forEach(member => {
        const el = document.createElement('div');
        el.className = 'flex items-center gap-4 p-3 bg-black/40 border-2 border-[#555] cursor-pointer transition-all duration-300 hover:bg-cp-cyan/10 hover:translate-x-1 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]';

        // Check requirements
        const levelOk = member.level >= mission.minLevel;
        const coolOk = !mission.minCool || member.stats.cool >= mission.minCool;
        const reflexOk = !mission.minReflex || member.stats.reflex >= mission.minReflex;
        const qualified = levelOk && coolOk && reflexOk;

        if (qualified) {
          el.classList.add('border-cp-cyan');
        } else {
          el.classList.add('opacity-50', 'cursor-not-allowed', 'border-red-900');
        }
        el.innerHTML = `
          <div class="flex-1">
            <div class="flex justify-between items-center mb-1">
              <div class="font-bold text-white font-cyber">${member.name}</div>
              <div class="text-xs text-cp-yellow font-cyber">LVL ${member.level}</div>
            </div>
            <div class="flex gap-3 text-xs text-gray-400 font-mono">
              <span>COOL: <span class="${member.stats.cool >= (mission.minCool || 0) ? 'text-cp-cyan' : 'text-red-500'}">${member.stats.cool}</span></span>
              <span>REF: <span class="${member.stats.reflex >= (mission.minReflex || 0) ? 'text-cp-cyan' : 'text-red-500'}">${member.stats.reflex}</span></span>
            </div>
          </div>
          <div class="w-6 h-6 border-2 border-cp-cyan flex items-center justify-center text-sm check-box transition-all"></div>
        `;

        if (qualified) {
          el.addEventListener('click', () => {
            audioManager.playClick();
            const index = selectedMemberIds.indexOf(member.id);
            const checkBox = el.querySelector('.check-box')!;

            if (index > -1) {
              // Deselect
              selectedMemberIds.splice(index, 1);
              el.classList.remove('bg-cp-cyan/20', 'border-cp-yellow', 'shadow-[0_0_20px_rgba(252,238,10,0.4)]');
              checkBox.classList.remove('bg-cp-yellow', 'border-cp-yellow');
              checkBox.textContent = '';
            } else {
              // Select (Max 3)
              if (selectedMemberIds.length >= 3) {
                this.showToast('MAX 3 MEMBERS', 'warning');
                return;
              }
              selectedMemberIds.push(member.id);
              el.classList.add('bg-cp-cyan/20', 'border-cp-yellow', 'shadow-[0_0_20px_rgba(252,238,10,0.4)]');
              checkBox.classList.add('bg-cp-yellow', 'border-cp-yellow');
              checkBox.textContent = '✓';
            }

            // Update UI State
            selectedCountEl.textContent = selectedMemberIds.length.toString();
            sendBtn.disabled = selectedMemberIds.length === 0;
            updateStats();
          });
        }

        crewList.appendChild(el);
      });
    }

    // Listeners
    modal.querySelector('#close-detail')?.addEventListener('click', () => overlay.remove());

    sendBtn.addEventListener('click', () => {
      audioManager.playClick();
      if (selectedMemberIds.length > 0) {
        // Play animation
        bikerAnim.style.animation = 'bikerSlide 1.5s linear forwards';

        // Disable button
        sendBtn.disabled = true;
        sendBtn.textContent = 'SENDING...';

        // Wait a bit for effect
        setTimeout(() => {
          const result = startMission(selectedMemberIds, mission.id);
          if (result.success) {
            audioManager.playPurchase();
            this.showToast('MISSION STARTED', 'success');
            sendBtn.textContent = 'SENT!';
            // Close the modal after a brief delay
            setTimeout(() => overlay.remove(), 800);
          } else {
            this.showToast(result.reason || 'FAILED', 'error');
            sendBtn.disabled = false;
            sendBtn.textContent = 'SEND CREW';
          }
        }, 1000);
      }
    });
  }

  private showMissionReward(detail: any) {
    const { rewards, leveledUp, injured } = detail;
    if (injured) {
      audioManager.playInjury();
      this.showToast(`MISSION FAILED - AGENT INJURED`, 'error');
    } else {
      audioManager.playMissionComplete();
      this.showToast(`MISSION COMPLETE(+${rewards.eddies}€)`, 'success');
      if (leveledUp) {
        audioManager.playLevelUp();
        setTimeout(() => this.showToast(`LEVEL UP!`, 'success'), 500);
      }
    }
  }

  private showToast(message: string, type: 'success' | 'warning' | 'error') {
    const toast = document.createElement('div');
    const colors = {
      'success': 'bg-green-500',
      'warning': 'bg-yellow-500',
      'error': 'bg-red-500'
    };

    toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 ${colors[type]} text-black font-bold font-cyber z-[20000] animate-bounce shadow-[0_0_10px_currentColor]`;
    toast.textContent = message;

    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private async openAfterlife() {
    const overlay = this.createOverlay();

    // Prevent clicks from passing through
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[500px] flex flex-col animate-modalSlideIn pointer-events-auto relative';

    // Generate a random class for the recruit to display
    const classes = Object.keys(RIDER_CLASSES) as (keyof typeof RIDER_CLASSES)[];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];

    // Use AsciiGenerator to get random recruit details
    const { art, name, description } = AsciiGenerator.generatePortrait();

    const recruit = {
      name: name,
      class: randomClass,
      description: description,
      cost: 1000,
      art: art
    };

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">AFTERLIFE BAR</h2>
        <button id="close-modal" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>

      <div class="p-6 flex flex-col gap-4">
        <div class="font-mono text-[10px] leading-none whitespace-pre text-cp-cyan bg-black/50 p-4 border border-cp-cyan/30 overflow-hidden select-none flex justify-center items-center min-h-[120px]">${recruit.art}</div>

        <div class="border-l-4 border-cp-yellow pl-4">
          <h3 class="text-white text-2xl font-cyber font-bold mb-1">${recruit.name}</h3>
          <div class="text-cp-yellow text-sm font-cyber mb-2">CLASS: ${recruit.class}</div>
          <p class="text-gray-400 text-sm italic mb-3">"${recruit.description}"</p>
          <div class="text-cp-cyan text-sm font-bold font-cyber border-t border-gray-700 pt-2">
            PASSIVE: ${RIDER_CLASSES[recruit.class].passive}
          </div>
        </div>

        <button id="recruit-btn" class="cyber-btn w-full py-4 text-xl mt-2 group relative overflow-hidden">
          <span class="relative z-10">RECRUIT (${recruit.cost}€)</span>
          <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-modal')?.addEventListener('click', () => overlay.remove());

    modal.querySelector('#recruit-btn')?.addEventListener('click', () => {
      audioManager.playClick();
      const state = gameStore.get();
      if (state.eddies >= recruit.cost) {
        addEddies(-recruit.cost);
        recruitMember(recruit.name, recruit.description, recruit.art, recruit.class as any);
        audioManager.playPurchase();
        this.showToast('MEMBER RECRUITED', 'success');
        overlay.remove();
      } else {
        this.showToast('INSUFFICIENT FUNDS', 'error');
      }
    });
  }

  private openRipperdoc() {
    const overlay = this.createOverlay();

    // Prevent clicks from passing through
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[900px] max-h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">RIPPERDOC</h2>
        <button id="close-ripperdoc" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        <h3 class="text-cp-yellow font-cyber mb-4">MEDICAL & UPGRADES</h3>
        <p class="text-gray-400 mb-4">Heal injured members and install cyberware</p>
        <div id="members-list"></div>
      </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    const membersList = modal.querySelector('#members-list')!;
    const state = gameStore.get();

    state.members.forEach(member => {
      const memberCard = document.createElement('div');
      memberCard.className = 'bg-black/60 border-2 border-cp-cyan p-4 mb-4';

      const healthPercent = (member.health / member.maxHealth) * 100;
      const coolCost = member.stats.cool * 100;
      const reflexCost = member.stats.reflex * 100;

      memberCard.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="text-cp-cyan font-bold text-lg font-cyber leading-none">${member.name} <span class="text-xs text-cp-yellow">LVL ${member.level}</span></div>
            <div class="text-xs text-gray-400 font-mono mt-1">COOL: <span class="text-white">${member.stats.cool}</span> | REF: <span class="text-white">${member.stats.reflex}</span></div>
          </div>
          <div class="text-sm font-bold ${member.injured ? 'text-cp-red' : 'text-green-500'}">${member.injured ? 'INJURED' : 'HEALTHY'}</div>
        </div>

        <div class="relative h-6 bg-gray-800 mb-2">
          <div class="absolute inset-0 bg-green-500" style="width: ${healthPercent}%"></div>
          <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">${member.health}/${member.maxHealth} HP</div>
        </div>
        
        ${member.injured ? `
          <button class="cyber-btn w-full mt-2" data-heal="${member.id}">HEAL (200€)</button>
        ` : `
          <div class="mt-3">
            <h4 class="text-cp-yellow text-sm mb-2 font-cyber">CYBERWARE UPGRADES</h4>
            <div class="grid grid-cols-3 gap-2">
              <button class="cyber-btn text-xs" data-upgrade="${member.id}" data-type="cool">+2 COOL (${coolCost}€)</button>
              <button class="cyber-btn text-xs" data-upgrade="${member.id}" data-type="reflex">+2 REF (${reflexCost}€)</button>
              <button class="cyber-btn text-xs" data-upgrade="${member.id}" data-type="health">+20 HP (500€)</button>
            </div>
          </div>
        `}
      `;

      membersList.appendChild(memberCard);
    });

    // Event listeners for heal buttons
    membersList.querySelectorAll('[data-heal]').forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playClick();
        const memberId = parseInt((btn as HTMLElement).dataset.heal!);
        if (healMember(memberId)) {
          audioManager.playHeal();
          this.showToast('MEMBER HEALED', 'success');
          overlay.remove();
          this.openRipperdoc();
        } else {
          this.showToast('INSUFFICIENT FUNDS', 'error');
        }
      });
    });

    // Event listeners for upgrade buttons
    membersList.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playClick();
        const memberId = parseInt((btn as HTMLElement).dataset.upgrade!);
        const type = (btn as HTMLElement).dataset.type as 'cool' | 'reflex' | 'health';
        if (upgradeMember(memberId, type)) {
          audioManager.playUpgrade();
          this.showToast(`UPGRADED: ${type.toUpperCase()}`, 'success');
          overlay.remove();
          this.openRipperdoc();
        } else {
          this.showToast('INSUFFICIENT FUNDS', 'error');
        }
      });
    });

    modal.querySelector('#close-ripperdoc')?.addEventListener('click', () => overlay.remove());
  }

  // HQ Tab Rendering Methods

  private renderRosterTab(container: Element) {
    container.innerHTML = '';
    const state = gameStore.get();

    // Bike animation section
    const bikeSection = document.createElement('div');
    bikeSection.className = 'w-full h-[120px] bg-black/30 border-2 border-cp-yellow relative overflow-hidden mb-4';
    bikeSection.innerHTML = `
      <div class="absolute left-[-150px] bottom-[10px] w-[150px] h-[100px]" style="animation: bikerSlide 4s linear infinite;">
        <img src="assets/biker.png" class="w-full h-full object-contain drop-shadow-[0_0_5px_var(--color-cp-cyan)]" />
      </div>
    `;
    container.appendChild(bikeSection);

    if (state.members.length === 0) {
      container.innerHTML += '<div class="text-cp-red text-center p-10 font-cyber text-xl">NO GANG MEMBERS. RECRUIT SOME AT THE BAR!</div>';
      return;
    }

    state.members.forEach(member => {
      const card = document.createElement('div');
      card.className = 'bg-black/60 border-2 border-cp-cyan p-4 mb-3';

      const healthPercent = (member.health / member.maxHealth) * 100;
      const xpPercent = (member.xp / member.xpToNext) * 100;

      let statusClass = 'text-green-500';
      let statusText = 'IDLE';
      if (member.injured) {
        statusClass = 'text-cp-red';
        statusText = 'INJURED';
      } else if (member.status === 'ON MISSION') {
        statusClass = 'text-cp-yellow';
        statusText = 'ON MISSION';
      }

      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="text-cp-cyan font-bold text-lg font-cyber">${member.name} <span class="text-sm text-cp-yellow">LVL ${member.level}</span></div>
            <div class="text-cp-cyan text-xs font-cyber mt-1">CLASS: ${member.class}</div>
          </div>
          <div class="text-sm font-bold ${statusClass}">${statusText}</div>
        </div>

        <div class="relative h-6 bg-gray-800 mb-2">
          <div class="absolute inset-0 bg-green-500" style="width: ${healthPercent}%"></div>
          <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">${member.health}/${member.maxHealth} HP</div>
        </div>

        <div class="relative h-4 bg-gray-800 mb-2">
          <div class="absolute inset-0 bg-cp-yellow" style="width: ${xpPercent}%"></div>
          <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">${member.xp}/${member.xpToNext} XP</div>
        </div>

        <div class="flex gap-4 text-sm text-gray-400 font-cyber">
          <span>COOL: ${member.stats.cool}</span>
          <span>REF: ${member.stats.reflex}</span>
        </div>
      `;

      container.appendChild(card);
    });
  }

  private renderTerritoryTab(container: Element) {
    const state = gameStore.get();
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = '<h3 class="text-cp-yellow font-cyber text-xl mb-2">NIGHT CITY DISTRICTS</h3><p class="text-gray-400">Territory status overview</p>';
    container.appendChild(header);

    state.territories.forEach((t, index) => {
      const div = document.createElement('div');
      div.className = `p-4 mb-3 border-l-4 transition-all duration-300 ${t.controlled ? 'bg-green-900/20 border-green-500' : 'bg-black/60 border-gray-600'}`;
      div.style.animationDelay = `${index * 0.1}s`;
      div.classList.add('animate-slideIn', 'opacity-0', 'fill-mode-forwards');

      const rivalGang = t.rivalGang ? rivalGangManager.getGangByTerritory(t.id) : null;

      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-lg font-cyber ${t.controlled ? 'text-green-400' : 'text-white'}">${t.name}</div>
            <div class="text-cp-yellow text-sm">+${t.income}€ / 10s</div>
          </div>
          <div>
            ${t.controlled
          ? '<span class="text-green-500 font-bold border border-green-500 px-2 py-1">✓ CONTROLLED</span>'
          : rivalGang
            ? `<span class="text-cp-red font-bold border border-cp-red px-2 py-1">⚔ ${rivalGang.name}</span>`
            : `<span class="text-gray-500 font-bold border border-gray-500 px-2 py-1">UNCLAIMED</span>`
        }
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  }

  private renderGangsTab(container: Element) {
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = '<h3 class="text-cp-yellow font-cyber text-xl mb-2">WARFARE</h3><p class="text-gray-400">Expand your territory and eliminate rivals</p>';
    container.appendChild(header);

    const state = gameStore.get();

    // --- Unclaimed Territories Section Removed ---
    // All territories are now owned by rival gangs at start


    // --- Rival Gangs Section ---
    const gangsHeader = document.createElement('div');
    gangsHeader.className = 'text-cp-red font-cyber text-sm mb-2 mt-6 border-b border-cp-red/50 pb-1';
    gangsHeader.textContent = 'RIVAL GANGS';
    container.appendChild(gangsHeader);

    const gangs = rivalGangManager.getGangInfo();
    console.log('Rendering Gangs Tab. Gangs:', gangs);

    if (gangs.length === 0) {
      const notice = document.createElement('div');
      notice.className = 'text-center text-green-500 font-cyber py-10 text-xl';
      notice.textContent = 'NO RIVAL GANGS REMAIN. YOU CONTROL NIGHT CITY!';
      container.appendChild(notice);
      return;
    }

    gangs.forEach((gang, index) => {
      const gangCard = document.createElement('div');
      gangCard.className = 'bg-black/60 border-2 border-cp-red p-4 mb-4';
      gangCard.style.animationDelay = `${index * 0.1}s`;

      gangCard.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-cp-red font-bold text-xl font-cyber">${gang.name}</div>
            <div class="text-gray-400 text-sm font-cyber">[${gang.personality.toUpperCase()}]</div>
          </div>
          <div class="text-sm text-gray-400">
            <span class="mr-4">⚔ ${gang.strength}</span>
            <span>🏴 ${gang.territories} territories</span>
          </div>
        </div>
      `;

      container.appendChild(gangCard);

      // Show territories controlled by this gang
      state.territories.forEach(territory => {
        const gangObj = rivalGangManager.getGangByTerritory(territory.id);
        if (gangObj && gangObj.name === gang.name) {
          const territoryCard = document.createElement('div');
          territoryCard.className = 'bg-black/40 border-l-4 border-cp-red p-3 mb-2 ml-4';

          territoryCard.innerHTML = `
            <div class="flex justify-between items-center">
              <div>
                <div class="text-cp-cyan font-bold font-cyber">${territory.name}</div>
                <div class="text-cp-yellow text-sm">+${territory.income}€ / 10s</div>
              </div>
              <button class="cyber-btn text-xs attack-btn" data-id="${territory.id}">ATTACK</button>
            </div>
          `;

          const attackBtn = territoryCard.querySelector('.attack-btn');
          attackBtn?.addEventListener('click', () => {
            audioManager.playClick();
            this.showAttackDialog(territory.id, gang.name, gangObj.strength);
          });

          container.appendChild(territoryCard);
        }
      });
    });
  }

  private showAttackDialog(territoryId: number, gangName: string, gangStrength: number) {
    const state = gameStore.get();
    const availableMembers = state.members.filter(m => m.status === 'IDLE' && !m.injured);

    if (availableMembers.length === 0) {
      this.showToast('NO AVAILABLE MEMBERS FOR ATTACK!', 'error');
      return;
    }

    const territory = state.territories.find(t => t.id === territoryId)!;

    const dialog = this.createOverlay();

    // Prevent clicks from passing through
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-red shadow-[0_0_40px_rgba(255,0,60,0.5)] w-[90%] max-w-[600px] max-h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-red/10 border-b-2 border-cp-red p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-red m-0 text-2xl drop-shadow-[0_0_10px_var(--cp-red)] font-cyber font-bold">ATTACK ${territory.name}</h2>
        <button id="close-attack-dialog" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>

      <div class="p-5 flex-1 overflow-y-auto">
        <p class="text-gray-400 mb-4">Target: ${gangName} (Strength: ${gangStrength})</p>

        <div class="bg-cp-red/5 border border-cp-red/30 p-3 mb-4">
          <div class="text-cp-red text-xs font-bold mb-1">SUCCESS CHANCE</div>
          <div class="text-white text-2xl font-cyber" id="success-chance">0%</div>
        </div>

        <h3 class="text-cp-yellow mb-3">SELECT CREW</h3>
        <div id="attack-crew-list" class="space-y-2 max-h-[300px] overflow-y-auto mb-4"></div>

        <div class="flex gap-2">
          <button id="confirm-attack" class="cyber-btn flex-1">ATTACK</button>
          <button id="cancel-attack" class="cyber-btn flex-1">CANCEL</button>
        </div>
      </div>
    `;

    dialog.appendChild(modal);
    document.body.appendChild(dialog);

    const selectedMembers: number[] = [];
    const crewList = modal.querySelector('#attack-crew-list')!;
    const chanceEl = modal.querySelector('#success-chance') as HTMLElement;

    const updateChance = () => {
      const attackers = state.members.filter(m => selectedMembers.includes(m.id));
      const playerPower = attackers.reduce((sum, m) => sum + 10 + (m.stats.cool * 2) + (m.stats.reflex * 2) + (m.level * 5), 0);

      let successChance = 0;
      if (playerPower > 0) {
        const ratio = playerPower / gangStrength;
        if (ratio >= 1.5) successChance = 100;
        else if (ratio <= 0.5) successChance = 0;
        else successChance = Math.round(((ratio - 0.5) / 1.0) * 100);
      }

      chanceEl.textContent = `${successChance}%`;
      chanceEl.style.color = successChance >= 80 ? 'lime' : successChance >= 50 ? 'var(--color-cp-yellow)' : 'var(--color-cp-red)';
    };

    availableMembers.forEach(member => {
      const memberEl = document.createElement('label');
      memberEl.className = 'flex items-center gap-3 p-2 bg-black/40 border border-cp-cyan/30 cursor-pointer hover:bg-cp-cyan/10';

      memberEl.innerHTML = `
        <input type="checkbox" value="${member.id}" class="w-5 h-5" data-power="${10 + (member.stats.cool * 2) + (member.stats.reflex * 2) + (member.level * 5)}">
        <span class="flex-1 font-cyber">${member.name} (LVL ${member.level} - COOL:${member.stats.cool} REF:${member.stats.reflex})</span>
      `;

      const checkbox = memberEl.querySelector('input') as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedMembers.push(member.id);
        } else {
          const index = selectedMembers.indexOf(member.id);
          if (index > -1) selectedMembers.splice(index, 1);
        }
        updateChance();
      });

      crewList.appendChild(memberEl);
    });

    modal.querySelector('#close-attack-dialog')?.addEventListener('click', () => dialog.remove());
    modal.querySelector('#cancel-attack')?.addEventListener('click', () => dialog.remove());

    modal.querySelector('#confirm-attack')?.addEventListener('click', () => {
      audioManager.playClick();
      if (selectedMembers.length === 0) {
        this.showToast('SELECT AT LEAST ONE MEMBER!', 'error');
        return;
      }

      const result = attackTerritory(territoryId, selectedMembers);

      if (result.success) {
        audioManager.playMissionComplete();
        this.showToast(result.message!, 'success');
        if ('loot' in result && result.loot) {
          setTimeout(() => this.showToast(`LOOTED ${result.loot}€!`, 'success'), 500);
        }
      } else {
        this.showToast(result.message!, 'error');
      }

      dialog.remove();
      this.modalContainer.innerHTML = '';
      this.openMissionBoard();
    });
  }


}
