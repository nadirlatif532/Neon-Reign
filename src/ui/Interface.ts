import { gameStore } from '../state/GameStore';
import { audioManager } from '../managers/AudioManager';
import { MapInterface } from './MapInterface';
import { setupHUD, startFlavorTextRotation, updateHUDResources } from './modules/HUD';
import { renderMissionsTab } from './modules/MissionUI';
import { renderRosterTab, openRipperdoc } from './modules/RosterUI';
import { renderTerritoryTab, openAfterlife } from './modules/TerritoryUI';
import { renderGangsTab } from './modules/DiplomacyUI';
import { renderEncounters } from './modules/EncounterUI';
import { setupGlobalClickEffects, showToast } from './utils/UIUtils';

export class Interface {
  private container: HTMLElement;
  private hudContainer: HTMLElement;
  private modalContainer: HTMLElement;
  private mapInterface = new MapInterface();
  private activeTab: 'missions' | 'roster' | 'map' | 'gangs' = 'missions';

  constructor() {
    this.container = document.getElementById('ui-layer')!;
    this.hudContainer = document.createElement('div');
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-container';
    this.modalContainer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none z-[60]';

    this.container.appendChild(this.hudContainer);
    this.container.appendChild(this.modalContainer);

    this.init();
  }

  private init() {
    setupHUD(this.hudContainer, this.modalContainer);
    startFlavorTextRotation();
    setupGlobalClickEffects();
    this.setupStoreSubscription();
    this.setupMainLayout();

    // Listen for global events
    window.addEventListener('game-event', (e: any) => {
      const { message, type } = e.detail;
      showToast(message, type);
      if (type === 'success') audioManager.playPurchase();
      if (type === 'bad') audioManager.playError();
    });

    // Listen for gang name modal trigger
    window.addEventListener('show-gang-name-modal', () => {
      import('./modules/SettingsUI').then(module => {
        module.showGangNameModal(this.modalContainer);
      });
    });

    // Listen for warfare updates to refresh map if open
    window.addEventListener('warfare-update', () => {
      if (this.activeTab === 'map') {
        const content = document.getElementById('tab-content');
        if (content) renderTerritoryTab(content, this.mapInterface, this.modalContainer);
      }
    });
  }

  private setupStoreSubscription() {
    gameStore.subscribe((state) => {
      updateHUDResources(state);

      // Update active tab content if needed
      const content = document.getElementById('tab-content');
      if (content) {
        if (this.activeTab === 'missions') renderMissionsTab(content, this.modalContainer);
        else if (this.activeTab === 'roster') renderRosterTab(content);
      }

      // Update Encounters on Map
      if (this.activeTab === 'map' && content) {
        renderEncounters(content, state.activeEncounters, this.modalContainer);
      }
    });
  }

  private setupMainLayout() {
    const mainLayout = document.createElement('div');
    mainLayout.id = 'main-layout';
    mainLayout.className = 'absolute top-24 left-4 right-4 bottom-16 flex gap-4 pointer-events-auto';

    mainLayout.innerHTML = `
            <div class="w-64 flex flex-col gap-2 shrink-0 z-10">
                <button class="nav-btn cyber-btn active" data-tab="missions">MISSIONS</button>
                <button class="nav-btn cyber-btn" data-tab="roster">ROSTER</button>
                <button class="nav-btn cyber-btn" data-tab="map">TERRITORY</button>
                <button class="nav-btn cyber-btn" data-tab="gangs">RIVALS</button>
                
                <div class="mt-auto space-y-2">
                    <button id="btn-ripperdoc" class="cyber-btn border-cp-red text-cp-red hover:bg-cp-red hover:text-white w-full">RIPPERDOC</button>
                    <button id="btn-afterlife" class="cyber-btn border-cp-purple text-cp-purple hover:bg-cp-purple hover:text-white w-full">AFTERLIFE</button>
                </div>
            </div>
            
            <div id="tab-content" class="flex-1 bg-black/60 border-2 border-cp-cyan p-4 relative overflow-hidden backdrop-blur-sm shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                <!-- Content injected here -->
            </div>
        `;

    this.container.appendChild(mainLayout);

    // Navigation Logic
    mainLayout.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.dataset.tab as any;
        this.switchTab(tab);

        mainLayout.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        audioManager.playClick();
      });
    });

    // Action Buttons
    mainLayout.querySelector('#btn-ripperdoc')?.addEventListener('click', () => {
      audioManager.playClick();
      openRipperdoc(this.modalContainer);
    });

    mainLayout.querySelector('#btn-afterlife')?.addEventListener('click', () => {
      audioManager.playClick();
      openAfterlife(this.modalContainer, this.mapInterface);
    });

    // Initial Render
    this.switchTab('missions');
  }

  private switchTab(tab: 'missions' | 'roster' | 'map' | 'gangs') {
    this.activeTab = tab;
    const content = document.getElementById('tab-content');
    if (!content) return;

    content.innerHTML = '';

    switch (tab) {
      case 'missions':
        renderMissionsTab(content, this.modalContainer);
        break;
      case 'roster':
        renderRosterTab(content);
        break;
      case 'map':
        renderTerritoryTab(content, this.mapInterface, this.modalContainer);
        // Render encounters initially
        renderEncounters(content, gameStore.get().activeEncounters, this.modalContainer);
        break;
      case 'gangs':
        renderGangsTab(content, this.modalContainer);
        break;
    }
  }
}
