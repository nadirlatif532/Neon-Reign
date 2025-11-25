import { gameStore, addEddies } from '../../state/GameStore';
import { rivalGangManager } from '../../managers/RivalGangManager';
import { audioManager } from '../../managers/AudioManager';
import { createOverlay, showToast } from '../utils/UIUtils';
import { openDiplomacyTutorial } from './TutorialUI';

export function renderGangsTab(container: Element, modalContainer: HTMLElement) {
    const gangs = rivalGangManager.getGangInfo();
    container.innerHTML = '';

    // Add Header with Tutorial Button
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4 border-b border-gray-700 pb-2';
    header.innerHTML = `
        <h3 class="text-cp-yellow font-cyber text-2xl uppercase tracking-wider">RIVAL GANGS</h3>
        <button id="diplomacy-help-btn" class="bg-black/90 border-2 border-cp-cyan text-cp-cyan w-12 h-12 rounded-full font-bold text-xl flex items-center justify-center hover:bg-cp-cyan hover:text-black transition-colors shadow-[0_0_15px_rgba(0,240,255,0.5)]">?</button>
    `;
    container.appendChild(header);

    header.querySelector('#diplomacy-help-btn')?.addEventListener('click', () => openDiplomacyTutorial(modalContainer));

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
            openDiplomacyModal(gang.id, modalContainer);
        });

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

export function openDiplomacyModal(gangId: string, modalContainer: HTMLElement) {
    const gang = rivalGangManager.getGangById(gangId);
    if (!gang) return;

    const overlay = createOverlay();
    const modal = document.createElement('div');
    const color = gang.color || '#fff';

    //Determine status based on relationship
    let status = 'NEUTRAL';
    let statusColor = '#999';
    let statusDescription = 'Neutral stance. May attack or leave you alone.';

    if (gang.relationship <= -50) {
        status = 'WAR';
        statusColor = '#FF0000';
        statusDescription = 'Hostile! Will attack your territories frequently.';
    } else if (gang.relationship >= 80) {
        status = 'ALLY';
        statusColor = '#00FF00';
        statusDescription = 'Allied! Will help defend your territories when under attack.';
    } else if (gang.relationship >= 30) {
        status = 'FRIENDLY';
        statusColor = '#00FFFF';
        statusDescription = 'Friendly. Less likely to attack, open to diplomacy.';
    }

    modal.className = `bg-cp-bg border-[3px] shadow-[0_0_40px_rgba(0,0,0,0.5)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto`;
    modal.style.borderColor = color;
    modal.style.boxShadow = `0 0 30px ${color}40`;

    modal.innerHTML = `
        <div class="bg-black/ 80 border-b-2 p-5 flex justify-between items-center shrink-0" style="border-color: ${color}">
            <h2 class="text-white m-0 text-3xl font-cyber font-bold uppercase" style="text-shadow: 0 0 10px ${color}">${gang.name}</h2>
            <button id="close-diplomacy" class="bg-transparent border-2 text-white text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-white/10" style="border-color: ${color}">&times;</button>
        </div>

        <div class="p-6">
            <div class="flex items-center gap-4 mb-4 bg-black/30 p-4 border-l-4" style="border-color: ${color}">
                <div class="text-4xl">🤝</div>
                <div>
                    <div class="text-gray-400 text-sm font-cyber">RELATIONSHIP</div>
                    <div class="text-2xl font-bold text-white">${gang.relationship} / 100</div>
                </div>
            </div>

            <div class="bg-black/40 p-4 border-l-4 mb-6" style="border-color: ${statusColor}">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-xl font-cyber" style="color: ${statusColor}">STATUS: ${status}</span>
                </div>
                <p class="text-gray-300 text-sm leading-relaxed">${statusDescription}</p>
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
    modalContainer.appendChild(overlay);

    modal.querySelector('#close-diplomacy')?.addEventListener('click', () => overlay.remove());

    modal.querySelectorAll('.dip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = (e.currentTarget as HTMLElement).dataset.action;
            handleDiplomacyAction(action as any, gang.id, overlay);
        });
    });
}

function handleDiplomacyAction(action: 'BRIBE' | 'TRUCE' | 'ALLIANCE', gangId: string, overlay: HTMLElement) {
    const state = gameStore.get();
    const gang = rivalGangManager.getGangById(gangId);
    if (!gang) return;

    switch (action) {
        case 'BRIBE':
            if (state.eddies >= 500) {
                addEddies(-500);
                rivalGangManager.changeRelationship(gangId, 10);
                audioManager.playPurchase();
                showToast(`BRIBED ${gang.name}`, 'success');
                overlay.remove();
            } else {
                showToast('INSUFFICIENT FUNDS', 'error');
            }
            break;
        case 'TRUCE':
            if (state.eddies >= 1000) {
                if (gang.relationship >= 0) {
                    showToast('ALREADY AT PEACE', 'warning');
                    return;
                }
                addEddies(-1000);
                gang.relationship = 0;
                audioManager.playLevelUp();
                showToast(`TRUCE SIGNED WITH ${gang.name}`, 'success');
                overlay.remove();
            } else {
                showToast('INSUFFICIENT FUNDS', 'error');
            }
            break;
        case 'ALLIANCE':
            if (state.eddies >= 2000 && state.rep >= 80) {
                if (gang.relationship < 80) {
                    showToast('RELATIONSHIP TOO LOW', 'warning');
                    return;
                }
                addEddies(-2000);
                rivalGangManager.setAlliance(gangId, true);
                audioManager.playLevelUp();
                showToast(`ALLIANCE FORMED WITH ${gang.name}!`, 'success');
                overlay.remove();
            } else {
                showToast('REQ: 2000€, 80 REP, 80+ REL', 'error');
            }
            break;
    }
}
