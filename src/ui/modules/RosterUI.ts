import { gameStore, addEddies, recruitMember, healMember, upgradeMember, RIDER_CLASSES } from '../../state/GameStore';
import { audioManager } from '../../managers/AudioManager';
import { AsciiGenerator } from '../../utils/AsciiGenerator';
import { createOverlay, showToast } from '../utils/UIUtils';

let rosterSort: 'STATUS' | 'LEVEL' | 'CLASS' | 'NAME' = 'STATUS';

export function renderRosterTab(container: Element) {
  container.innerHTML = '';
  const state = gameStore.get();

  // Gang name header
  const gangHeader = document.createElement('h3');
  gangHeader.className = 'text-cp-yellow font-cyber text-2xl mb-4 text-center uppercase tracking-wider';
  gangHeader.textContent = `${state.gangName}'S CREW`;
  container.appendChild(gangHeader);

  // Sort Controls
  const sortControls = document.createElement('div');
  sortControls.className = 'flex gap-2 mb-4 justify-center flex-wrap';
  const sorts: { id: string, label: string }[] = [
    { id: 'STATUS', label: 'STATUS' },
    { id: 'LEVEL', label: 'LEVEL' },
    { id: 'CLASS', label: 'CLASS' },
    { id: 'NAME', label: 'NAME' }
  ];

  sorts.forEach(sort => {
    const btn = document.createElement('button');
    btn.className = `cyber-btn text-xs py-1 px-3 ${rosterSort === sort.id ? 'bg-cp-cyan text-black' : ''}`;
    btn.textContent = sort.label;
    btn.addEventListener('click', () => {
      rosterSort = sort.id as any;
      audioManager.playClick();
      renderRosterTab(container);
    });
    sortControls.appendChild(btn);
  });
  container.appendChild(sortControls);

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

  // Sort Members
  const sortedMembers = [...state.members].sort((a, b) => {
    switch (rosterSort) {
      case 'STATUS':
        // Injured > Mission > Idle
        const score = (m: any) => m.injured ? 2 : (m.status === 'ON MISSION' ? 1 : 0);
        return score(b) - score(a);
      case 'LEVEL':
        return b.level - a.level;
      case 'CLASS':
        return a.class.localeCompare(b.class);
      case 'NAME':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  sortedMembers.forEach(member => {
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

export function openRipperdoc(modalContainer: HTMLElement) {
  const overlay = createOverlay();

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
  modalContainer.appendChild(overlay);

  const tabContent = modal.querySelector('#ripperdoc-tab-content')!;
  let activeTab = 'medical';

  // Tab switching
  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = (btn as HTMLElement).dataset.tab!;
      audioManager.playClick();

      if (activeTab === 'medical') renderMedicalTab(tabContent, overlay);
      else if (activeTab === 'recruit') renderRecruitTab(tabContent, overlay);
    });
  });

  modal.querySelector('#close-ripperdoc')?.addEventListener('click', () => overlay.remove());

  // Initial Render
  renderMedicalTab(tabContent, overlay);
}

function renderMedicalTab(container: Element, overlay: HTMLElement) {
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
        showToast('MEMBER HEALED', 'success');
        renderMedicalTab(container, overlay); // Re-render
      } else {
        showToast('INSUFFICIENT FUNDS', 'error');
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
        showToast(`UPGRADED: ${type.toUpperCase()}`, 'success');
        renderMedicalTab(container, overlay); // Re-render
      } else {
        showToast('INSUFFICIENT FUNDS', 'error');
      }
    });
  });
}

function renderRecruitTab(container: Element, overlay: HTMLElement) {
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
      showToast('MEMBER RECRUITED', 'success');
      // Refresh to show a new recruit or stay? Let's refresh to show new recruit
      renderRecruitTab(container, overlay);
    } else {
      showToast('INSUFFICIENT FUNDS', 'error');
    }
  });
}
