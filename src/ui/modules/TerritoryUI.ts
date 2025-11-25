import { gameStore, addEddies, purchaseHideoutUpgrade } from '../../state/GameStore';
import { warfareManager } from '../../managers/WarfareManager';
import { audioManager } from '../../managers/AudioManager';
import { createOverlay, showToast } from '../utils/UIUtils';
import { openTerritoryTutorial } from './TutorialUI';
import { renderGangsTab } from './DiplomacyUI';
import { MapInterface } from '../MapInterface';

export function renderTerritoryTab(container: Element, mapInterface: MapInterface, modalContainer: HTMLElement) {
    mapInterface.cleanupTooltips();

    // Ensure container has relative positioning for absolute children
    (container as HTMLElement).style.position = 'relative';

    mapInterface.mount(container as HTMLElement);

    // Add Tutorial Button inside map viewing area, positioned above WESTBROOK
    const helpBtn = document.createElement('button');
    helpBtn.className = 'bg-black/90 border-2 border-cp-cyan text-cp-cyan w-12 h-12 rounded-full font-bold text-xl hover:bg-cp-cyan hover:text-black transition-colors shadow-[0_0_15px_rgba(0,240,255,0.5)]';
    helpBtn.style.position = 'absolute';
    helpBtn.style.top = '30px';
    helpBtn.style.right = '15px';
    helpBtn.style.zIndex = '100';
    helpBtn.innerText = '?';
    helpBtn.onclick = () => openTerritoryTutorial(modalContainer);
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

export function openTerritoryModal(territoryId: number, modalContainer: HTMLElement) {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // Special Case: Hideout
    if (territory.name === 'THE GARAGE') {
        openHideoutModal(modalContainer);
        return;
    }

    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">${territory.name}</h2>
        <button id="close-territory" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>
      <div id="territory-content" class="p-6"></div>
    `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    renderModalContent(modal.querySelector('#territory-content') as HTMLElement, territoryId, overlay);

    modal.querySelector('#close-territory')?.addEventListener('click', () => overlay.remove());
}

function renderModalContent(container: HTMLElement, territoryId: number, overlay: HTMLElement) {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);
    if (!territory) return;

    const intelLevel = territory.intel || 0;
    const isOwned = territory.controlled;

    // Calculate Intel Visibility
    const showDefense = isOwned || intelLevel >= 25;
    const showIncome = isOwned || intelLevel >= 50;
    const showGarrison = isOwned || intelLevel >= 75;

    let content = `
      <div class="flex gap-4 mb-6">
        <div class="flex-1 bg-black/30 p-3 border border-gray-700">
           <div class="text-xs text-gray-400">CONTROL</div>
           <div class="text-xl font-bold ${isOwned ? 'text-cp-cyan' : 'text-cp-red'}">${isOwned ? 'PLAYER' : (territory.rivalGang || 'NEUTRAL')}</div>
        </div>
        <div class="flex-1 bg-black/30 p-3 border border-gray-700">
           <div class="text-xs text-gray-400">INTEL</div>
           <div class="text-xl font-bold text-cp-yellow">${Math.round(territory.intel || 0)}%</div>
        </div>
      </div>

      <div class="space-y-4 mb-6">
         <div class="flex justify-between items-center border-b border-gray-800 pb-2">
            <span class="text-gray-400">DEFENSE</span>
            <span class="font-mono ${showDefense ? 'text-white' : 'text-gray-600 blur-sm'}">${showDefense ? territory.defense + '/100' : '??/??'}</span>
         </div>
         <div class="flex justify-between items-center border-b border-gray-800 pb-2">
            <span class="text-gray-400">INCOME</span>
            <span class="font-mono ${showIncome ? 'text-cp-yellow' : 'text-gray-600 blur-sm'}">${showIncome ? territory.income + '€/day' : '???€'}</span>
         </div>
         <div class="flex justify-between items-center border-b border-gray-800 pb-2">
            <span class="text-gray-400">GARRISON</span>
            <span class="font-mono ${showGarrison ? 'text-cp-red' : 'text-gray-600 blur-sm'}">${showGarrison ? 'HIGH' : 'UNKNOWN'}</span>
         </div>
      </div>
    `;

    // Operations
    content += '<h3 class="text-cp-cyan font-cyber mb-3">OPERATIONS</h3><div class="grid grid-cols-2 gap-3">';

    if (isOwned) {
        content += `
        <button class="op-btn cyber-btn py-3" data-op="FORTIFY">FORTIFY (200€)</button>
        <button class="op-btn cyber-btn py-3" data-op="DEFEND">DEFEND</button>
      `;
    } else {
        content += `
        <button class="op-btn cyber-btn py-3" data-op="SCOUT">SCOUT (50€)</button>
        <button class="op-btn cyber-btn py-3" data-op="SABOTAGE">SABOTAGE (150€)</button>
        <button class="op-btn cyber-btn py-3 border-cp-red text-cp-red hover:bg-cp-red hover:text-white" data-op="RAID">RAID</button>
        <button class="op-btn cyber-btn py-3 border-cp-red text-cp-red hover:bg-cp-red hover:text-white" data-op="ASSAULT">ASSAULT</button>
      `;
    }
    content += '</div>';

    container.innerHTML = content;

    container.querySelectorAll('.op-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const op = (e.target as HTMLElement).dataset.op as any;
            handleOperationClick(op, territoryId, overlay);
        });
    });
}

function handleOperationClick(type: 'SCOUT' | 'RAID' | 'ASSAULT' | 'FORTIFY' | 'SABOTAGE' | 'DEFEND', territoryId: number, overlay: HTMLElement) {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);
    if (!territory) return;

    let cost = 0;
    let success = false;
    let message = '';

    switch (type) {
        case 'SCOUT':
            cost = 50;
            if (state.eddies >= cost) {
                addEddies(-cost);
                warfareManager.startOperation('SCOUT', territoryId, 'PLAYER', 0, 5000);
                success = true;
                message = 'INTEL GATHERED';
            }
            break;
        case 'SABOTAGE':
            cost = 150;
            if (state.eddies >= cost) {
                addEddies(-cost);
                warfareManager.startOperation('SABOTAGE', territoryId, 'PLAYER', 0, 10000);
                success = true;
                message = 'SABOTAGE SUCCESSFUL';
            }
            break;
        case 'FORTIFY':
            cost = 200;
            if (state.eddies >= cost) {
                addEddies(-cost);
                warfareManager.startOperation('FORTIFY', territoryId, 'PLAYER', 0, 10000);
                success = true;
                message = 'DEFENSES IMPROVED';
            }
            break;
        case 'RAID':
            warfareManager.startOperation('RAID', territoryId, 'PLAYER', 100, 5000);
            success = true;
            message = 'RAID INITIATED';
            overlay.remove();
            break;
        case 'ASSAULT':
            const available = state.members.filter(m => m.status === 'IDLE' && !m.injured);
            if (available.length > 0) {
                const squad = available.slice(0, 3).map(m => m.id);
                const result = warfareManager.initiatePlayerAssault(territoryId, squad);
                if (result && result.success) {
                    success = true;
                    message = result.message;
                    overlay.remove();
                } else {
                    message = result ? result.message : 'FAILED TO INITIATE';
                }
            } else {
                message = 'NO AVAILABLE MEMBERS';
            }
            break;
        case 'DEFEND':
            warfareManager.startOperation('DEFEND', territoryId, 'PLAYER', 100, 10000);
            success = true;
            message = 'DEFENSES BOLSTERED';
            break;
    }

    if (success) {
        audioManager.playPurchase();
        showToast(message, 'success');
        if (type !== 'RAID' && type !== 'ASSAULT') {
            renderModalContent(overlay.querySelector('#territory-content') as HTMLElement, territoryId, overlay);
        }
    } else {
        showToast(message || 'INSUFFICIENT FUNDS', 'error');
    }
}

export function openHideoutModal(modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[800px] flex flex-col animate-modalSlideIn pointer-events-auto max-h-[90vh] overflow-hidden';

    const render = () => {
        const state = gameStore.get();
        const upgrades = state.upgrades;

        modal.innerHTML = `
        <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
          <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">HIDEOUT UPGRADES</h2>
          <button id="close-hideout" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
        </div>
        
        <div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
           ${upgrades.map(upgrade => {
            const nextLevel = upgrade.level + 1;
            const cost = upgrade.cost * nextLevel;
            const isMaxed = upgrade.level >= upgrade.maxLevel;

            return `
                 <div class="bg-black/40 border-2 ${isMaxed ? 'border-cp-yellow' : 'border-gray-700'} p-4 flex flex-col gap-2">
                    <div class="flex justify-between items-start">
                       <h3 class="text-white font-cyber font-bold text-lg">${upgrade.name}</h3>
                       <span class="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-cp-cyan">LVL ${upgrade.level}/${upgrade.maxLevel}</span>
                    </div>
                    <p class="text-gray-400 text-sm h-10">${upgrade.description}</p>
                    
                    <div class="mt-2">
                       ${!isMaxed ? `
                         <div class="text-xs text-cp-yellow mb-1">EFFECT: ${upgrade.effect}</div>
                         <button class="upgrade-btn cyber-btn w-full py-2 text-sm flex justify-between px-4" data-id="${upgrade.id}">
                            <span>UPGRADE</span>
                            <span>${cost}€</span>
                         </button>
                       ` : `
                         <div class="text-center text-cp-yellow font-bold py-2 border border-cp-yellow bg-cp-yellow/10">MAX LEVEL</div>
                       `}
                    </div>
                 </div>
               `;
        }).join('')}
        </div>
      `;

        modal.querySelector('#close-hideout')?.addEventListener('click', () => overlay.remove());

        modal.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id!;
                handleUpgrade(id, render);
            });
        });
    };

    render();
    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);
}

function handleUpgrade(upgradeId: string, renderFn: () => void) {
    const success = purchaseHideoutUpgrade(upgradeId);
    if (success) {
        audioManager.playUpgrade();
        showToast('UPGRADE INSTALLED', 'success');
        renderFn();
    } else {
        audioManager.playError();
        showToast('INSUFFICIENT FUNDS', 'error');
    }
}

export function openAfterlife(modalContainer: HTMLElement, mapInterface: MapInterface) {
    const overlay = createOverlay();

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
    modalContainer.appendChild(overlay);

    const tabContent = modal.querySelector('#afterlife-tab-content')!;
    let activeTab = 'territory';

    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = (btn as HTMLElement).dataset.tab!;
            audioManager.playClick();

            if (activeTab === 'territory') renderTerritoryTab(tabContent, mapInterface, modalContainer);
            else if (activeTab === 'gangs') renderGangsTab(tabContent, modalContainer);
        });
    });

    modal.querySelector('#close-modal')?.addEventListener('click', () => overlay.remove());

    // Initial Render
    renderTerritoryTab(tabContent, mapInterface, modalContainer);
}
