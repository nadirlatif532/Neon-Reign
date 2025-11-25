import { encounterManager } from '../../managers/EncounterManager';
import { audioManager } from '../../managers/AudioManager';
import { removeEncounter } from '../../state/GameStore';
import { ENCOUNTERS } from '../../data/Encounters';
import { createOverlay } from '../utils/UIUtils';

export function renderEncounters(container: HTMLElement, encounters: { id: string; encounterId: string; x: number; y: number }[], modalContainer: HTMLElement) {
  // Remove existing encounters
  container.querySelectorAll('.encounter-marker').forEach(el => el.remove());

  encounters.forEach(enc => {
    const el = document.createElement('div');
    el.className = 'encounter-marker absolute w-8 h-8 bg-cp-red rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-20 animate-pulse shadow-[0_0_15px_var(--cp-red)]';
    el.style.left = `${enc.x}px`;
    el.style.top = `${enc.y}px`;
    el.innerHTML = '<span class="text-white font-bold text-xs">!</span>';

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity';
    tooltip.textContent = 'ENCOUNTER';
    el.appendChild(tooltip);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playClick();
      openEncounterModal(enc.id, enc.encounterId, modalContainer);
    });

    container.appendChild(el);
  });
}

export function openEncounterModal(instanceId: string, encounterId: string, modalContainer: HTMLElement) {
  const encounter = ENCOUNTERS.find(e => e.id === encounterId);
  if (!encounter) return;

  const overlay = createOverlay();
  const modal = document.createElement('div');
  modal.className = 'bg-cp-bg border-[3px] border-cp-red shadow-[0_0_40px_rgba(255,0,0,0.5)] w-[90%] max-w-[500px] flex flex-col animate-modalSlideIn pointer-events-auto';

  modal.innerHTML = `
      <div class="bg-cp-red/10 border-b-2 border-cp-red p-5">
        <h2 class="text-cp-red m-0 text-2xl drop-shadow-[0_0_10px_var(--cp-red)] font-cyber font-bold uppercase">${encounter.title}</h2>
      </div>
      
      <div class="p-6">
        <p class="text-white text-lg leading-relaxed mb-6 font-cyber border-l-4 border-cp-red pl-4 italic">
          "${encounter.description}"
        </p>

        <div class="flex flex-col gap-3">
          ${encounter.options.map((choice, index) => `
            <button class="choice-btn cyber-btn w-full py-3 text-left px-4 relative overflow-hidden group" data-index="${index}">
              <span class="relative z-10 font-bold group-hover:text-black transition-colors">
                ${index + 1}. ${choice.text}
              </span>
              <div class="absolute inset-0 bg-cp-cyan/0 group-hover:bg-cp-cyan transition-colors duration-300"></div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

  overlay.appendChild(modal);
  modalContainer.appendChild(overlay);

  modal.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt((e.currentTarget as HTMLElement).dataset.index!);
      const result = encounterManager.resolveEncounter(encounterId, index);

      // Remove encounter from map
      removeEncounter(instanceId);

      overlay.remove();
      showEncounterResult(result.message, result.success, result.effects, modalContainer);
    });
  });
}

function showEncounterResult(message: string, success: boolean, effects: any, modalContainer: HTMLElement) {
  const overlay = createOverlay();
  const modal = document.createElement('div');
  modal.className = `bg-cp-bg border-[3px] ${success ? 'border-cp-cyan' : 'border-cp-red'} shadow-[0_0_40px_rgba(0,0,0,0.5)] w-[90%] max-w-[400px] flex flex-col animate-modalSlideIn pointer-events-auto text-center p-6`;

  modal.innerHTML = `
      <h2 class="${success ? 'text-cp-cyan' : 'text-cp-red'} text-2xl font-cyber font-bold mb-4 uppercase">
        ${success ? 'SUCCESS' : 'FAILURE'}
      </h2>
      <p class="text-white mb-6">${message}</p>
      
      ${effects ? `
        <div class="bg-black/30 p-3 mb-4 text-sm space-y-1">
          ${effects.rewards?.eddies ? `<div class="text-cp-yellow">+${effects.rewards.eddies}€</div>` : ''}
          ${effects.rewards?.xp ? `<div class="text-cp-cyan">+${effects.rewards.xp} XP</div>` : ''}
          ${effects.rewards?.rep ? `<div class="text-green-400">+${effects.rewards.rep} REP</div>` : ''}
          ${effects.penalties?.eddies ? `<div class="text-red-500">-${effects.penalties.eddies}€</div>` : ''}
          ${effects.penalties?.health ? `<div class="text-red-500">-${effects.penalties.health} HP</div>` : ''}
        </div>
      ` : ''}

      <button id="close-result" class="cyber-btn w-full py-2">CONTINUE</button>
    `;

  overlay.appendChild(modal);
  modalContainer.appendChild(overlay);

  modal.querySelector('#close-result')?.addEventListener('click', () => {
    audioManager.playClick();
    overlay.remove();
  });

  if (success) audioManager.playPurchase();
  else audioManager.playError();
}
