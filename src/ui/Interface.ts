import {
  gameStore,
  addEddies,
  recruitMember,
  healMember,
  upgradeMember,
  removeEncounter,
  setGangName,
  startMission,
  refreshMissions,
  Mission,
  RIDER_CLASSES
} from '../state/GameStore';
import { rivalGangManager } from '../managers/RivalGangManager';
import { MapInterface } from './MapInterface';
import { warfareManager } from '../managers/WarfareManager';
import { saveManager } from '../managers/SaveManager';
import { encounterManager } from '../managers/EncounterManager';
import { audioManager } from '../managers/AudioManager';
import { AsciiGenerator } from '../utils/AsciiGenerator';
import { ENCOUNTERS } from '../data/Encounters';

export class Interface {
  private container: HTMLElement;
  private hudContainer: HTMLElement;
  private modalContainer: HTMLElement;
  private activeTab: string = 'missions';
  private lastActiveMissions: any[] = [];
  private lastAvailableMissions: any[] = [];
  private lastTerritories: any[] = [];
  private mapInterface: MapInterface;


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
    this.createScanlines();
    this.setupGlobalClickEffects();

    this.mapInterface = new MapInterface();
  }

  private createScanlines() {
    const scanlines = document.createElement('div');
    scanlines.className = 'scanlines';
    document.body.appendChild(scanlines);

    // Add a CRT vignette effect
    const vignette = document.createElement('div');
    vignette.className = 'crt-vignette';
    document.body.appendChild(vignette);
  }

  private setupGlobalClickEffects() {
    document.addEventListener('click', (e) => {
      this.createClickParticle(e.clientX, e.clientY);
    });
  }

  private createClickParticle(x: number, y: number) {
    const particle = document.createElement('div');
    particle.className = 'click-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);

    // Random glitch offset
    const xOffset = (Math.random() - 0.5) * 20;
    const yOffset = (Math.random() - 0.5) * 20;
    particle.style.setProperty('--x-offset', `${xOffset}px`);
    particle.style.setProperty('--y-offset', `${yOffset}px`);

    setTimeout(() => {
      particle.remove();
    }, 500);
  }

  public showFloatingText(text: string, x: number, y: number, colorClass: string = 'text-white') {
    const el = document.createElement('div');
    el.className = `floating-text ${colorClass} font-cyber font-bold text-xl absolute pointer-events-none z-[100]`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.body.appendChild(el);

    // Animate and remove
    const animation = el.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: 'translate(0, -50px) scale(1.2)', opacity: 0 }
    ], {
      duration: 1000,
      easing: 'ease-out'
    });

    animation.onfinish = () => el.remove();
  }

  private setupHUD() {
    this.hudContainer.className = 'absolute top-0 left-0 w-full pointer-events-none flex flex-col z-50';
    this.hudContainer.innerHTML = `
      <header class="flex justify-between items-center border-b-2 border-cp-yellow pb-2 mb-0 bg-cp-black/70 -skew-x-[10deg] border-l-[10px] border-l-cp-cyan pointer-events-auto px-4 py-2">
        <div id="gang-name-header" class="text-2xl font-black text-cp-cyan ml-5 skew-x-[10deg] drop-shadow-[2px_2px_var(--cp-red)] font-cyber">
          ${gameStore.get().gangName.toUpperCase()}
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

  public showGangNameModal() {
    const overlay = this.createOverlay();
    overlay.style.zIndex = '100000';
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_60px_rgba(0,240,255,0.8)] w-[90%] max-w-[500px] flex flex-col animate-modalSlideIn pointer-events-auto';

    const currentName = gameStore.get().gangName;

    modal.innerHTML = `
      <div class="bg-cp-cyan/20 border-b-2 border-cp-cyan p-5">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold uppercase text-center">NAME YOUR GANG</h2>
      </div>
      
      <div class="p-6">
        <p class="text-white text-lg mb-6 font-cyber leading-relaxed border-l-4 border-cp-cyan pl-4 bg-black/30 p-4">
          Every legend needs a name. What will the streets call your crew?
        </p>
        
        <div class="mb-6">
          <label class="text-cp-yellow font-cyber text-sm mb-2 block uppercase tracking-wider">Gang Name</label>
          <input 
            type="text" 
            id="gang-name-input" 
            class="w-full bg-black/60 border-2 border-cp-cyan text-white font-cyber text-lg p-3 focus:outline-none focus:border-cp-yellow transition-colors"
            placeholder="V's Gang"
            value="${currentName}"
            maxlength="30"
          />
          <p class="text-gray-500 text-xs mt-2 font-cyber">Max 30 characters</p>
        </div>
      </div>

      <div class="border-t-2 border-cp-cyan p-5">
        <button id="confirm-gang-name" class="cyber-btn w-full py-3 text-xl">CONFIRM</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#gang-name-input') as HTMLInputElement;
    const confirmBtn = modal.querySelector('#confirm-gang-name');

    // Focus input
    setTimeout(() => input?.focus(), 100);

    // Submit on Enter key
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmBtn?.dispatchEvent(new Event('click'));
      }
    });

    confirmBtn?.addEventListener('click', () => {
      audioManager.playClick();
      const gangName = input?.value.trim() || "V's Gang";
      setGangName(gangName);
      saveManager.saveGame(); // Save the new gang name
      overlay.remove();
      this.showToast(`GANG RENAMED: ${gangName}`, 'success');
    });
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
          This will <span class="text-cp-red font-bold">PERMANENTLY DELETE</span> <span class="text-cp-cyan font-bold">${gameStore.get().gangName}</span> and all your progress, including:
        </p>
        
        <ul class="text-gray-300 mb-6 space-y-2 font-cyber ml-4">
          <li>• All gang members and upgrades</li>
          <li>• All eddies and reputation</li>
          <li>• All territories and completed missions</li>
          <li>• All game settings</li>
        </ul>

        <p class="text-cp-yellow text-base font-cyber text-center font-bold mb-4 animate-pulse">
          DELETE ${gameStore.get().gangName.toUpperCase()} FOREVER?
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
        // Get current gang name for dynamic messages
        const gangName = gameStore.get().gangName.toUpperCase();

        // Mix static and dynamic flavor texts
        const staticTexts = [
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

        const dynamicTexts = [
          `${gangName} REPUTATION SPREADING`,
          `${gangName} TURF SECURE`,
          `${gangName} ON THE RISE`,
          `STREET CRED: ${gangName} RESPECTED`,
          `${gangName} MAKING MOVES`,
          `RIVALS FEAR ${gangName}`,
          `${gangName} OWNS THE NIGHT`
        ];

        const allTexts = [...staticTexts, ...dynamicTexts];
        const randomText = allTexts[Math.floor(Math.random() * allTexts.length)];
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

    // Listen for gang name modal trigger from tutorial
    window.addEventListener('show-gang-name-modal', () => {
      this.showGangNameModal();
    });

    window.addEventListener('open-territory-details', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      this.openTerritoryModal(detail.territoryId);
    });

  }

  private setupStoreSubscription() {
    gameStore.subscribe(state => {
      const eddiesEl = document.getElementById('hud-eddies');
      const repEl = document.getElementById('hud-rep');
      const membersEl = document.getElementById('hud-members');

      if (eddiesEl) {
        const currentEddies = parseInt(eddiesEl.textContent?.replace(/,/g, '') || '0');
        if (state.eddies !== currentEddies && currentEddies !== 0) {
          const diff = state.eddies - currentEddies;
          const rect = eddiesEl.getBoundingClientRect();
          this.showFloatingText(`${diff > 0 ? '+' : ''}${diff}€`, rect.right + 20, rect.top, diff > 0 ? 'text-cp-yellow' : 'text-cp-red');
        }
        eddiesEl.textContent = state.eddies.toLocaleString();
        eddiesEl.parentElement?.classList.remove('animate-pulse-cyber');
        void eddiesEl.offsetWidth; // trigger reflow
        eddiesEl.parentElement?.classList.add('animate-pulse-cyber');
      }

      if (repEl) {
        const currentRep = parseInt(repEl.textContent?.replace(/,/g, '') || '0');
        if (state.rep !== currentRep && currentRep !== 0) {
          const diff = state.rep - currentRep;
          const rect = repEl.getBoundingClientRect();
          this.showFloatingText(`${diff > 0 ? '+' : ''}${diff} REP`, rect.right + 20, rect.top, diff > 0 ? 'text-cp-cyan' : 'text-cp-red');
        }
        repEl.textContent = state.rep.toLocaleString();
      }

      if (membersEl) membersEl.textContent = state.members.length.toString();

      // Update gang name header
      const gangNameHeader = document.getElementById('gang-name-header');
      if (gangNameHeader) gangNameHeader.textContent = state.gangName.toUpperCase();

      // Update Mission Board if open and on missions tab
      // Update Mission Board
      const missionContent = document.getElementById('mission-tab-content');
      if (missionContent) {
        if (this.activeTab === 'missions') {
          if (state.activeMissions !== this.lastActiveMissions || state.availableMissions !== this.lastAvailableMissions) {
            this.lastActiveMissions = state.activeMissions;
            this.lastAvailableMissions = state.availableMissions;
            this.renderMissionsTab(missionContent);
          }
        } else if (this.activeTab === 'roster') {
          this.renderRosterTab(missionContent);
        }
      }

      // Update Afterlife (Territory/Gangs)
      const afterlifeContent = document.getElementById('afterlife-tab-content');
      if (afterlifeContent) {
        if (state.territories !== this.lastTerritories) {
          this.lastTerritories = state.territories;
          if (this.activeTab === 'territory') this.renderTerritoryTab(afterlifeContent);
          if (this.activeTab === 'gangs') this.renderGangsTab(afterlifeContent);
        }
      }

      // Update Ripperdoc (Medical)
      const ripperdocContent = document.getElementById('ripperdoc-tab-content');
      if (ripperdocContent && this.activeTab === 'medical') {
        const overlay = ripperdocContent.closest('.fixed') as HTMLElement;
        if (overlay) this.renderMedicalTab(ripperdocContent, overlay);
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
        <h2 id="hideout-title" class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">${gameStore.get().gangName}'s HIDEOUT</h2>
        <button id="close-modal" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>
      
      <!-- Tabs -->
      <div class="flex gap-2 p-4 bg-black/30 border-b border-cp-yellow/30">
        <button class="cyber-btn tab-btn active" data-tab="missions">MISSIONS</button>
        <button class="cyber-btn tab-btn" data-tab="roster">ROSTER</button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-5" id="mission-tab-content"></div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    const tabContent = modal.querySelector('#mission-tab-content')!;
    this.activeTab = 'missions';

    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        audioManager.playClick();

        if (this.activeTab === 'missions') this.renderMissionsTab(tabContent);
        else if (this.activeTab === 'roster') this.renderRosterTab(tabContent);
      });
    });

    // Close button
    modal.querySelector('#close-modal')?.addEventListener('click', () => overlay.remove());

    // Render initial tab
    this.renderMissionsTab(tabContent);
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
    const gangName = gameStore.get().gangName.toUpperCase();

    if (injured) {
      audioManager.playInjury();
      this.showToast(`${gangName} MISSION FAILED - AGENT INJURED`, 'error');
    } else {
      audioManager.playMissionComplete();
      this.showToast(`${gangName} MISSION COMPLETE (+${rewards.eddies}€)`, 'success');
      if (leveledUp) {
        audioManager.playLevelUp();
        setTimeout(() => this.showToast(`${gangName} MEMBER LEVELED UP!`, 'success'), 500);
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
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[1000px] h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto relative';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">AFTERLIFE</h2>
        <button id="close-modal" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 p-4 bg-black/30 border-b border-cp-yellow/30">
        <button class="cyber-btn tab-btn active" data-tab="territory">TERRITORY</button>
        <button class="cyber-btn tab-btn" data-tab="gangs">GANGS</button>
      </div>

      <div class="flex-1 overflow-y-auto p-5" id="afterlife-tab-content"></div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    const tabContent = modal.querySelector('#afterlife-tab-content')!;
    this.activeTab = 'territory';

    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        audioManager.playClick();

        if (this.activeTab === 'territory') this.renderTerritoryTab(tabContent);
        else if (this.activeTab === 'gangs') this.renderGangsTab(tabContent);
      });
    });

    modal.querySelector('#close-modal')?.addEventListener('click', () => overlay.remove());

    // Initial Render
    this.renderTerritoryTab(tabContent);
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

      <!-- Tabs -->
      <div class="flex gap-2 p-4 bg-black/30 border-b border-cp-yellow/30">
        <button class="cyber-btn tab-btn active" data-tab="medical">MEDICAL</button>
        <button class="cyber-btn tab-btn" data-tab="recruit">RECRUIT</button>
      </div>

      <div class="flex-1 overflow-y-auto p-5" id="ripperdoc-tab-content"></div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    const tabContent = modal.querySelector('#ripperdoc-tab-content')!;
    this.activeTab = 'medical';

    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = (btn as HTMLElement).dataset.tab!;
        audioManager.playClick();

        if (this.activeTab === 'medical') this.renderMedicalTab(tabContent, overlay);
        else if (this.activeTab === 'recruit') this.renderRecruitTab(tabContent, overlay);
      });
    });

    modal.querySelector('#close-ripperdoc')?.addEventListener('click', () => overlay.remove());

    // Initial Render
    this.renderMedicalTab(tabContent, overlay);
  }

  private renderMedicalTab(container: Element, overlay: HTMLElement) {
    container.innerHTML = `
        <h3 class="text-cp-yellow font-cyber mb-4">MEDICAL & UPGRADES</h3>
        <p class="text-gray-400 mb-4">Heal injured members and install cyberware</p>
        <div id="members-list"></div>
    `;

    const membersList = container.querySelector('#members-list')!;
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
          this.renderMedicalTab(container, overlay); // Re-render
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
          this.renderMedicalTab(container, overlay); // Re-render
        } else {
          this.showToast('INSUFFICIENT FUNDS', 'error');
        }
      });
    });
  }

  private renderRecruitTab(container: Element, overlay: HTMLElement) {
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

    container.innerHTML = `
      <div class="p-2 flex flex-col gap-4">
        <h3 class="text-cp-yellow font-cyber">RECRUIT NEW MEMBERS</h3>
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
          <span class="relative z-10">JOIN ${gameStore.get().gangName.toUpperCase()} (${recruit.cost}€)</span>
          <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    `;

    container.querySelector('#recruit-btn')?.addEventListener('click', () => {
      audioManager.playClick();
      const state = gameStore.get();
      if (state.eddies >= recruit.cost) {
        addEddies(-recruit.cost);
        recruitMember(recruit.name, recruit.description, recruit.art, recruit.class as any);
        audioManager.playPurchase();
        this.showToast('MEMBER RECRUITED', 'success');
        // Refresh to show a new recruit or stay? Let's refresh to show new recruit
        this.renderRecruitTab(container, overlay);
      } else {
        this.showToast('INSUFFICIENT FUNDS', 'error');
      }
    });
  }

  // HQ Tab Rendering Methods

  private renderRosterTab(container: Element) {
    container.innerHTML = '';
    const state = gameStore.get();

    // Gang name header
    const gangHeader = document.createElement('h3');
    gangHeader.className = 'text-cp-yellow font-cyber text-2xl mb-4 text-center uppercase tracking-wider';
    gangHeader.textContent = `${state.gangName}'S CREW`;
    container.appendChild(gangHeader);

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
    this.mapInterface.cleanupTooltips();

    // Ensure container has relative positioning for absolute children
    (container as HTMLElement).style.position = 'relative';

    this.mapInterface.mount(container as HTMLElement);

    // Add Tutorial Button inside map viewing area, positioned above WESTBROOK
    const helpBtn = document.createElement('button');
    helpBtn.className = 'bg-black/90 border-2 border-cp-cyan text-cp-cyan w-12 h-12 rounded-full font-bold text-xl hover:bg-cp-cyan hover:text-black transition-colors shadow-[0_0_15px_rgba(0,240,255,0.5)]';
    helpBtn.style.position = 'absolute';
    helpBtn.style.top = '30px';
    helpBtn.style.right = '15px';
    helpBtn.style.zIndex = '100';
    helpBtn.innerText = '?';
    helpBtn.onclick = () => this.openTerritoryTutorial();
    container.appendChild(helpBtn);

    // Add Event Ticker
    const ticker = document.createElement('div');
    ticker.id = 'event-ticker';
    ticker.className = 'absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 border-y border-cp-yellow text-cp-yellow px-6 py-2 font-cyber text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(255,215,0,0.3)] hidden';
    ticker.innerHTML = '<span class="animate-pulse">⚠ ACTIVE EVENT: <span id="event-name">POLICE RAID</span></span>';
    container.appendChild(ticker);

    // Check for active event
    const activeEvent = warfareManager.getCurrentEvent();
    if (activeEvent) {
      ticker.querySelector('#event-name')!.textContent = activeEvent.name;
      ticker.classList.remove('hidden');
    }
  }

  private openTerritoryModal(territoryId: number) {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // Redirect to Hideout Modal if it's the Badlands
    if (territory.name === 'BADLANDS') {
      this.openHideoutModal();
      return;
    }

    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = `bg-cp-bg border-[3px] shadow-[0_0_40px_rgba(0,0,0,0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto transition-colors duration-300`;

    // Initial Render
    this.renderModalContent(modal, territoryId);

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    // Subscribe to store updates for live feedback
    const unsubscribe = gameStore.subscribe(() => {
      if (document.body.contains(modal)) {
        this.renderModalContent(modal, territoryId);
      }
    });

    // Listeners (Close)
    // Actually, we need to attach listeners AFTER render.
    // Let's make renderModalContent handle the innerHTML, and we attach a global listener to the modal for delegation or re-attach.

    // Better approach: Re-attach listeners in renderModalContent? 
    // Or just delegate events to the modal container.

    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'close-territory' || target.closest('#close-territory')) {
        this.mapInterface.cleanupTooltips();
        unsubscribe(); // Stop listening
        overlay.remove();
      }

      if (target.classList.contains('op-btn')) {
        const opType = target.dataset.op;
        this.handleOperationClick(opType as any, territoryId, overlay);
      }


    });
  }

  private renderModalContent(modal: HTMLElement, territoryId: number) {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);
    if (!territory) return;

    const isPlayer = territory.controlled;
    const rival = territory.rivalGang ? rivalGangManager.getGangByTerritory(territory.id) : null;
    const hexColor = isPlayer ? '#00F0FF' : (rival?.color || '#888');

    modal.style.borderColor = hexColor;
    modal.style.boxShadow = `0 0 40px ${hexColor}40`;

    modal.innerHTML = `
        <div class="bg-black/80 border-b-2 p-5 flex justify-between items-center shrink-0" style="border-color: ${hexColor}">
            <div>
                <h2 class="text-white m-0 text-3xl font-cyber font-bold uppercase" style="text-shadow: 0 0 10px ${hexColor}">${territory.name}</h2>
                <div class="text-sm font-cyber text-gray-400">${territory.district}</div>
            </div>
            <div class="flex gap-2">

                <button id="close-territory" class="bg-transparent border-2 text-white text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-white/10" style="border-color: ${hexColor}">&times;</button>
            </div>
        </div>

        <div class="p-6 overflow-y-auto max-h-[70vh]">
            <p class="text-white text-lg mb-6 font-cyber leading-relaxed border-l-4 pl-4 bg-black/30 p-4" style="border-color: ${hexColor}">
                "${territory.description}"
            </p>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-black/40 border border-gray-700 p-3">
                    <div class="text-xs text-gray-400 font-cyber">CONTROL</div>
                    <div class="text-xl font-bold font-cyber" style="color: ${hexColor}">
                        ${isPlayer ? 'YOUR GANG' : (rival ? rival.name : 'UNCLAIMED')}
                    </div>
                </div>
                <div class="bg-black/40 border border-gray-700 p-3">
                    <div class="text-xs text-gray-400 font-cyber">INCOME</div>
                    <div class="text-xl text-cp-yellow font-bold font-cyber">+${territory.income}€ / 1m</div>
                </div>
                <div class="bg-black/40 border border-gray-700 p-3">
                    <div class="text-xs text-gray-400 font-cyber">DEFENSE</div>
                    <div class="w-full h-2 bg-gray-800 mt-1">
                        <div class="h-full bg-blue-500 transition-all duration-500" style="width: ${territory.defense}%"></div>
                    </div>
                    <div class="text-right text-xs text-blue-400 mt-1">${territory.defense}%</div>
                </div>
                <div class="bg-black/40 border border-gray-700 p-3">
                    <div class="text-xs text-gray-400 font-cyber">HEAT</div>
                    <div class="w-full h-2 bg-gray-800 mt-1">
                        <div class="h-full bg-red-500 transition-all duration-500" style="width: ${territory.heat}%"></div>
                    </div>
                    <div class="text-right text-xs text-red-400 mt-1">${territory.heat}%</div>
                </div>
            </div>

            <!-- Operations Section -->
            <div class="border-t border-gray-700 pt-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-cp-cyan font-cyber text-lg">OPERATIONS</h3>
                    ${!isPlayer ? `<div class="text-xs text-gray-400">INTEL: <span class="text-white">${territory.intel || 0}%</span></div>` : ''}
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button class="op-btn cyber-btn text-sm py-2" data-op="SCOUT">SCOUT (50€)</button>
                    ${isPlayer ? `
                        <button class="op-btn cyber-btn text-sm py-2" data-op="FORTIFY">FORTIFY (200€)</button>
                    ` : `
                        <button class="op-btn cyber-btn text-sm py-2" data-op="SABOTAGE">SABOTAGE (300€)</button>
                        <button class="op-btn cyber-btn text-sm py-2" data-op="RAID">RAID (100€)</button>
                        <button class="op-btn cyber-btn text-sm py-2 bg-red-900/50 hover:bg-red-900" data-op="ASSAULT">ASSAULT (1000€)</button>
                    `}
                </div>
            </div>
            
            <div id="active-ops" class="mt-4"></div>
        </div>
    `;

    // Render Active Ops
    const activeOpsContainer = modal.querySelector('#active-ops')!;
    const ops = warfareManager.getActiveOperations(territory.id);

    if (ops.length > 0) {
      activeOpsContainer.innerHTML = '<div class="text-xs text-gray-500 mb-2">ACTIVE OPERATIONS</div>';
      ops.forEach(op => {
        const el = document.createElement('div');
        el.className = 'bg-black/50 border border-gray-600 p-2 text-sm flex justify-between mb-1';
        el.innerHTML = `
                <span class="text-cp-cyan">${op.type}</span>
                <span class="text-gray-400">${Math.ceil((op.endTime - Date.now()) / 1000)}s</span>
              `;
        activeOpsContainer.appendChild(el);
      });
    }
  }

  private handleOperationClick(type: 'SCOUT' | 'RAID' | 'ASSAULT' | 'FORTIFY' | 'SABOTAGE', territoryId: number, overlay: HTMLElement) {
    const state = gameStore.get();
    let cost = 0;
    let duration = 10000;
    let power = 100; // Base power

    // Dynamic Power Calculation
    const repBonus = state.rep * 10;
    const armory = state.upgrades.find(u => u.id === 'ARMORY');
    const armoryBonus = armory ? armory.level * 100 : 0;
    const playerPower = 500 + repBonus + armoryBonus;

    switch (type) {
      case 'SCOUT': cost = 50; duration = 5000; break;
      case 'SABOTAGE': cost = 300; duration = 10000; break;
      case 'RAID': cost = 100; power = 200; duration = 15000; break; // Reduced cost to 100
      case 'ASSAULT': cost = 1000; power = playerPower; duration = 30000; break; // Dynamic Power
      case 'FORTIFY': cost = 200; duration = 10000; break;
    }

    if (state.eddies >= cost) {
      addEddies(-cost);
      warfareManager.startOperation(type, territoryId, 'PLAYER', power, duration);
      audioManager.playPurchase();
      this.showToast(`${type} OPERATION STARTED`, 'success');
      overlay.remove();
    } else {
      this.showToast('INSUFFICIENT FUNDS', 'error');
    }
  }

  private openTerritoryTutorial() {
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-black/95 border border-cp-cyan p-8 max-w-[500px] text-white font-cyber relative animate-modalSlideIn shadow-[0_0_50px_rgba(0,240,255,0.2)] pointer-events-auto';

    modal.innerHTML = `
        <h2 class="text-2xl text-cp-cyan font-bold mb-4 border-b border-gray-700 pb-2">TERRITORY GUIDE</h2>
        <div class="space-y-4 text-sm text-gray-300">
            <div>
                <strong class="text-white">INCOME:</strong> Controlled territories generate eddies every 60 seconds. High <span class="text-cp-yellow">STABILITY</span> ensures full payment.
            </div>
            <div>
                <strong class="text-white">DEFENSE:</strong> Determines how hard it is to capture. Lower it by <span class="text-red-400">RAIDING</span> before you Assault.
            </div>
            <div>
                <strong class="text-white">HEAT:</strong> High heat attracts Police Raids. It decays over time, but aggressive actions raise it.
            </div>
            <div class="border-t border-gray-700 pt-2 mt-2">
                <strong class="text-cp-cyan">OPERATIONS:</strong>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="text-white">SCOUT:</span> Reveal details & gain Intel.</li>
                    <li><span class="text-white">RAID:</span> Steal cash & lower Defense.</li>
                    <li><span class="text-white">ASSAULT:</span> Capture the territory. Power scales with Rep & Armory.</li>
                    <li><span class="text-white">FORTIFY:</span> Repair Defense.</li>
                </ul>
            </div>
        </div>
        <button class="mt-6 w-full bg-cp-cyan text-black font-bold py-2 hover:bg-white transition-colors">GOT IT</button>
    `;

    modal.querySelector('button')?.addEventListener('click', () => overlay.remove());
    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);
  }

  private openHideoutModal() {
    const state = gameStore.get();
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-yellow shadow-[0_0_40px_rgba(255,215,0,0.5)] w-[90%] max-w-[800px] h-[80vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
        <div class="bg-black/80 border-b-2 border-cp-yellow p-5 flex justify-between items-center shrink-0">
            <h2 class="text-cp-yellow m-0 text-3xl font-cyber font-bold uppercase">HIDEOUT UPGRADES</h2>
            <button id="close-hideout" class="bg-transparent border-2 border-cp-yellow text-cp-yellow text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-cp-yellow hover:text-black">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            ${state.upgrades.map(upgrade => {
      const isMax = upgrade.level >= upgrade.maxLevel;
      const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level));
      const canAfford = state.eddies >= cost;

      return `
                <div class="bg-black/40 border-2 ${isMax ? 'border-cp-cyan' : 'border-gray-600'} p-4 flex flex-col relative overflow-hidden group hover:border-cp-yellow transition-colors">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-xl font-cyber font-bold text-white">${upgrade.name}</h3>
                        <div class="text-cp-yellow font-bold">LVL ${upgrade.level}/${upgrade.maxLevel}</div>
                    </div>
                    <p class="text-gray-400 text-sm mb-4 h-10">${upgrade.description}</p>
                    <div class="text-xs text-cp-cyan mb-4">${upgrade.effect}</div>
                    
                    <div class="mt-auto">
                        ${isMax ?
          `<button class="w-full py-2 bg-cp-cyan/20 text-cp-cyan font-bold border border-cp-cyan cursor-default">MAX LEVEL</button>` :
          `<button class="upgrade-btn w-full py-2 ${canAfford ? 'bg-cp-yellow text-black hover:bg-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'} font-bold font-cyber transition-colors" 
                                data-id="${upgrade.id}" ${!canAfford ? 'disabled' : ''}>
                                UPGRADE (${cost}€)
                            </button>`
        }
                    </div>
                </div>
            `;
    }).join('')}
        </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-hideout')?.addEventListener('click', () => overlay.remove());

    modal.querySelectorAll('.upgrade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        this.handleUpgrade(id, overlay);
      });
    });
  }

  private handleUpgrade(upgradeId: string, overlay: HTMLElement) {
    const state = gameStore.get();
    const upgrade = state.upgrades.find(u => u.id === upgradeId);

    if (!upgrade) return;
    if (upgrade.level >= upgrade.maxLevel) return;

    const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level));

    if (state.eddies >= cost) {
      addEddies(-cost);
      upgrade.level++;

      // Apply immediate effects if any (most are passive checked elsewhere)
      // But we need to update the store to trigger re-renders
      gameStore.setKey('upgrades', [...state.upgrades]);

      audioManager.playPurchase();
      this.showToast(`${upgrade.name} UPGRADED TO LEVEL ${upgrade.level}`, 'success');

      // Refresh modal
      overlay.remove();
      this.openHideoutModal();
    } else {
      this.showToast('INSUFFICIENT FUNDS', 'error');
    }
  }

  private openDiplomacyTutorial() {
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-black/95 border border-cp-yellow p-8 max-w-[500px] text-white font-cyber relative animate-modalSlideIn shadow-[0_0_50px_rgba(255,215,0,0.2)] pointer-events-auto';

    modal.innerHTML = `
        <h2 class="text-2xl text-cp-yellow font-bold mb-4 border-b border-gray-700 pb-2">DIPLOMACY GUIDE</h2>
        <div class="space-y-4 text-sm text-gray-300">
            <div>
                <strong class="text-white">RELATIONSHIP:</strong> Ranges from -100 (WAR) to +100 (ALLY).
                <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li><span class="text-red-500">WAR (-50):</span> They will attack your turf.</li>
                    <li><span class="text-green-400">FRIENDLY (+0):</span> Open to trade.</li>
                    <li><span class="text-cp-cyan">ALLY (+80):</span> Will defend you.</li>
                </ul>
            </div>
            <div>
                <strong class="text-white">PACTS:</strong>
                <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li><span class="text-cp-yellow">NON-AGGRESSION:</span> Prevents attacks for a duration.</li>
                    <li><span class="text-cp-cyan">ALLIANCE:</span> Mutual defense and shared intel.</li>
                </ul>
            </div>
            <div class="border-t border-gray-700 pt-2 mt-2">
                <strong class="text-cp-yellow">ACTIONS:</strong>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="text-white">BRIBE:</span> Pay eddies to improve relations.</li>
                    <li><span class="text-white">TRUCE:</span> End a war immediately.</li>
                    <li><span class="text-white">ALLIANCE:</span> Form a pact for mutual benefit.</li>
                </ul>
            </div>
        </div>
        <button class="mt-6 w-full bg-cp-yellow text-black font-bold py-2 hover:bg-white transition-colors">GOT IT</button>
    `;

    modal.querySelector('button')?.addEventListener('click', () => overlay.remove());
    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);
  }

  private renderGangsTab(container: Element) {
    const gangs = rivalGangManager.getGangInfo();
    container.innerHTML = '';

    // Add Header with Tutorial Button
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4 border-b border-gray-700 pb-2';
    header.innerHTML = `
        <h3 class="text-cp-yellow font-cyber text-2xl uppercase tracking-wider">RIVAL GANGS</h3>
        <button id="diplomacy-help-btn" class="bg-transparent border border-gray-500 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors">?</button>
    `;
    container.appendChild(header);

    header.querySelector('#diplomacy-help-btn')?.addEventListener('click', () => this.openDiplomacyTutorial());

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    gangs.forEach(gang => {
      const card = document.createElement('div');
      card.className = 'bg-black/40 border-2 p-4 cursor-pointer hover:bg-white/5 transition-colors';
      card.style.borderColor = gang.color;

      // Relationship Status
      let relStatus = 'NEUTRAL';
      let relColor = 'text-gray-400';
      if (gang.relationship <= -50) { relStatus = 'WAR'; relColor = 'text-red-500'; }
      else if (gang.relationship < 0) { relStatus = 'HOSTILE'; relColor = 'text-orange-500'; }
      else if (gang.relationship >= 80) { relStatus = 'ALLY'; relColor = 'text-cp-cyan'; }
      else if (gang.relationship > 0) { relStatus = 'FRIENDLY'; relColor = 'text-green-400'; }

      card.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-cyber font-bold text-white" style="text-shadow: 0 0 5px ${gang.color}">${gang.name}</h3>
                <div class="text-sm font-bold ${relColor}">${relStatus} (${gang.relationship})</div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
                <div>STR: ${gang.strength}</div>
                <div>TURF: ${gang.territories}</div>
                <div>AGGR: ${gang.personality.toUpperCase()}</div>
            </div>
            <div class="w-full bg-gray-800 h-1 mt-2">
                <div class="h-full transition-all" style="width: ${Math.max(0, gang.relationship + 100) / 2}%; background-color: ${gang.color}"></div>
            </div>
        `;

      card.addEventListener('click', () => {
        this.openDiplomacyModal(gang.id);
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  private openDiplomacyModal(gangId: string) {
    const gang = rivalGangManager.getGangById(gangId);
    if (!gang) return;

    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    const color = gang.color || '#fff';

    modal.className = `bg-cp-bg border-[3px] shadow-[0_0_40px_rgba(0,0,0,0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto`;
    modal.style.borderColor = color;
    modal.style.boxShadow = `0 0 30px ${color}40`;

    modal.innerHTML = `
        <div class="bg-black/80 border-b-2 p-5 flex justify-between items-center shrink-0" style="border-color: ${color}">
            <h2 class="text-white m-0 text-3xl font-cyber font-bold uppercase" style="text-shadow: 0 0 10px ${color}">${gang.name}</h2>
            <button id="close-diplomacy" class="bg-transparent border-2 text-white text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-white/10" style="border-color: ${color}">&times;</button>
        </div>

        <div class="p-6">
            <div class="flex items-center gap-4 mb-6 bg-black/30 p-4 border-l-4" style="border-color: ${color}">
                <div class="text-4xl">🤝</div>
                <div>
                    <div class="text-gray-400 text-sm font-cyber">RELATIONSHIP</div>
                    <div class="text-2xl font-bold text-white">${gang.relationship} / 100</div>
                </div>
            </div>

            <h3 class="text-cp-cyan font-cyber text-lg mb-3">DIPLOMATIC ACTIONS</h3>
            <div class="space-y-3">
                <button class="dip-btn cyber-btn w-full py-3 flex justify-between items-center px-4" data-action="BRIBE">
                    <span>BRIBE (Improve Relations)</span>
                    <span class="text-cp-yellow font-bold">500€</span>
                </button>
                <button class="dip-btn cyber-btn w-full py-3 flex justify-between items-center px-4" data-action="TRUCE">
                    <span>OFFER TRUCE (End War)</span>
                    <span class="text-cp-yellow font-bold">1000€</span>
                </button>
                <button class="dip-btn cyber-btn w-full py-3 flex justify-between items-center px-4 border-cp-cyan text-cp-cyan hover:bg-cp-cyan/10" data-action="ALLIANCE">
                    <span>PROPOSE ALLIANCE</span>
                    <span class="text-cp-yellow font-bold">2000€</span>
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-diplomacy')?.addEventListener('click', () => overlay.remove());

    modal.querySelectorAll('.dip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.handleDiplomacyAction(action as any, gang.id, overlay);
      });
    });
  }

  private handleDiplomacyAction(action: 'BRIBE' | 'TRUCE' | 'ALLIANCE', gangId: string, overlay: HTMLElement) {
    const state = gameStore.get();
    const gang = rivalGangManager.getGangById(gangId);
    if (!gang) return;

    switch (action) {
      case 'BRIBE':
        if (state.eddies >= 500) {
          addEddies(-500);
          rivalGangManager.changeRelationship(gangId, 10);
          audioManager.playPurchase();
          this.showToast(`BRIBED ${gang.name}`, 'success');
          overlay.remove();
        } else {
          this.showToast('INSUFFICIENT FUNDS', 'error');
        }
        break;
      case 'TRUCE':
        if (state.eddies >= 1000) {
          if (gang.relationship >= 0) {
            this.showToast('ALREADY AT PEACE', 'warning');
            return;
          }
          addEddies(-1000);
          gang.relationship = 0;
          audioManager.playLevelUp();
          this.showToast(`TRUCE SIGNED WITH ${gang.name}`, 'success');
          overlay.remove();
        } else {
          this.showToast('INSUFFICIENT FUNDS', 'error');
        }
        break;
      case 'ALLIANCE':
        if (state.eddies >= 2000 && state.rep >= 80) {
          if (gang.relationship < 80) {
            this.showToast('RELATIONSHIP TOO LOW', 'warning');
            return;
          }
          addEddies(-2000);
          rivalGangManager.setAlliance(gangId, true);
          audioManager.playLevelUp();
          this.showToast(`ALLIANCE FORMED WITH ${gang.name}!`, 'success');
          overlay.remove();
        } else {
          this.showToast('REQ: 2000€, 80 REP, 80+ REL', 'error');
        }
        break;
    }
  }

  private openTerritoryTutorial() {
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cyber border-2 border-cp-cyan max-w-3xl mx-auto my-12 shadow-[0_0_30px_rgba(0,240,255,0.4)]';
    modal.innerHTML = `
        <div class="flex justify-between items-center p-4 bg-cp-cyan/10 border-b-2 border-cp-cyan">
            <h2 class="text-2xl font-cyber text-cp-cyan uppercase tracking-wider">Territory Warfare Guide</h2>
            <button id="close-tutorial" class="bg-transparent border-2 border-cp-cyan text-cp-cyan text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-cp-cyan hover:text-black transition-colors">&times;</button>
        </div>

        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Operations -->
            <div class="bg-black/30 p-4 border-l-4 border-cp-yellow">
                <h3 class="text-cp-yellow font-cyber text-xl mb-2 uppercase">Operations</h3>
                <div class="space-y-2 text-gray-300">
                    <div><span class="text-cp-cyan font-bold">SCOUT</span> - Gather intel on territories. Higher intel reveals Defense, Income, Garrison strength, and weaknesses.</div>
                    <div><span class="text-cp-cyan font-bold">SABOTAGE</span> - Weaken defenses covertly with minimal heat gain.</div>
                    <div><span class="text-cp-cyan font-bold">RAID</span> - Quick attack to steal eddies and weaken territory (increases heat).</div>
                    <div><span class="text-cp-cyan font-bold">ASSAULT</span> - Full attack to capture territory. Requires high power and generates massive heat.</div>
                    <div><span class="text-cp-cyan font-bold">FORTIFY</span> - Strengthen your territory's defenses.</div>
                </div>
            </div>

            <!-- Intel System -->
            <div class="bg-black/30 p-4 border-l-4 border-blue-400">
                <h3 class="text-blue-400 font-cyber text-xl mb-2 uppercase">Intel System</h3>
                <div class="space-y-2 text-gray-300">
                    <div>Intel unlocks progressive information about territories:</div>
                    <div class="ml-4">• <span class="text-cp-cyan">25%</span> - Defense & Stability</div>
                    <div class="ml-4">• <span class="text-cp-cyan">50%</span> - Income & Building Slots</div>
                    <div class="ml-4">• <span class="text-cp-cyan">75%</span> - Enemy Garrison Strength</div>
                    <div class="ml-4">• <span class="text-cp-cyan">100%</span> - Critical Weakness (+10% combat bonus)</div>
                </div>
            </div>

            <!-- Diplomacy -->
            <div class="bg-black/30 p-4 border-l-4 border-purple-400">
                <h3 class="text-purple-400 font-cyber text-xl mb-2 uppercase">Diplomacy</h3>
                <div class="space-y-2 text-gray-300">
                    <div>Manage relationships with rival gangs in the "Gangs" tab:</div>
                    <div class="ml-4">• <span class="text-cp-cyan">BRIBE</span> - Improve relations (500€)</div>
                    <div class="ml-4">• <span class="text-cp-cyan">DEMAND TRIBUTE</span> - Extract money from weaker gangs</div>
                    <div class="ml-4">• <span class="text-cp-cyan">BUY INTEL</span> - Purchase intelligence on territories (200€)</div>
                    <div class="ml-4">• <span class="text-cp-cyan">SIGN PACT</span> - Non-aggression agreement (5 min duration)</div>
                </div>
            </div>

            <!-- Events -->
            <div class="bg-black/30 p-4 border-l-4 border-cp-yellow">
                <h3 class="text-cp-yellow font-cyber text-xl mb-2 uppercase">Global Events</h3>
                <div class="space-y-2 text-gray-300">
                    <div>Watch for random events that affect gameplay:</div>
                    <div class="ml-4">• <span class="text-cp-cyan">POLICE CRACKDOWN</span> - Heat rises faster</div>
                    <div class="ml-4">• <span class="text-cp-cyan">BLACK MARKET BOOM</span> - Increased income</div>
                    <div class="ml-4">• <span class="text-cp-cyan">GANG WARFARE</span> - Rivals distracted</div>
                </div>
            </div>

            <!-- Heat & Police -->
            <div class="bg-black/30 p-4 border-l-4 border-red-500">
                <h3 class="text-red-500 font-cyber text-xl mb-2 uppercase">Heat & Police</h3>
                <div class="space-y-2 text-gray-300">
                    <div><span class="text-cp-cyan font-bold">HEAT</span> - Increases with aggressive operations. High heat (80+) triggers police raids.</div>
                    <div><span class="text-cp-cyan font-bold">POLICE RAIDS</span> - Damage defense/stability and cost 500€ in bribes. Heat drops after raid.</div>
                    <div>Manage heat carefully to avoid costly interference.</div>
                </div>
            </div>

            <!-- Tips -->
            <div class="bg-black/30 p-4 border-l-4 border-green-400">
                <h3 class="text-green-400 font-cyber text-xl mb-2 uppercase">Strategic Tips</h3>
                <div class="space-y-2 text-gray-300">
                    <div>• Scout before assaulting to gain combat bonuses</div>
                    <div>• Use sabotage to weaken targets without raising heat</div>
                    <div>• Build relationships before demanding tribute or requesting proxy wars</div>
                    <div>• Monitor global events for strategic opportunities</div>
                    <div>• Fortify territories regularly to prevent enemy captures</div>
                </div>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    this.modalContainer.appendChild(overlay);

    modal.querySelector('#close-tutorial')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
}

