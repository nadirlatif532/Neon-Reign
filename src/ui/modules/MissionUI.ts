import { gameStore, startMission, refreshMissions, Mission, RIDER_CLASSES } from '../../state/GameStore';
import { audioManager } from '../../managers/AudioManager';
import { createOverlay, showToast } from '../utils/UIUtils';

let lastActiveMissionsHash: string = '';

export function openMissionBoard(modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[1000px] h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
      <div class="bg-cp-cyan/10 border-b-2 border-cp-cyan p-5 flex justify-between items-center shrink-0">
        <h2 class="text-cp-cyan m-0 text-3xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">MISSION BOARD</h2>
        <button id="close-board" class="bg-transparent border-2 border-cp-red text-cp-red text-3xl w-10 h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold">&times;</button>
      </div>
      <div id="mission-list-container" class="flex-1 overflow-hidden relative"></div>
    `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    const listContainer = modal.querySelector('#mission-list-container')!;
    renderMissionsTab(listContainer, modalContainer);

    modal.querySelector('#close-board')?.addEventListener('click', () => overlay.remove());
}

export function renderMissionsTab(container: Element, modalContainer: HTMLElement) {
    const state = gameStore.get();

    // Check if we need to re-render (optimization)
    const currentHash = JSON.stringify(state.availableMissions) + JSON.stringify(state.activeMissions);
    if (container.innerHTML !== '' && currentHash === lastActiveMissionsHash) {
        return;
    }

    lastActiveMissionsHash = currentHash;
    container.innerHTML = '';

    // Layout: 2 Columns (Available / Active)
    const layout = document.createElement('div');
    layout.className = 'flex flex-col md:flex-row h-full gap-4 p-4';

    // Available Missions
    const availableCol = document.createElement('div');
    availableCol.className = 'flex-1 flex flex-col min-w-0 bg-black/30 border border-gray-700';
    availableCol.innerHTML = `
        <div class="p-3 border-b border-gray-700 bg-black/50 flex justify-between items-center">
            <h3 class="text-cp-yellow font-cyber m-0">AVAILABLE JOBS</h3>
            <button id="refresh-missions" class="cyber-btn text-xs py-1 px-2">REFRESH</button>
        </div>
        <div id="available-list" class="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin"></div>
    `;

    // Active Missions
    const activeCol = document.createElement('div');
    activeCol.className = 'flex-1 flex flex-col min-w-0 bg-black/30 border border-gray-700';
    activeCol.innerHTML = `
        <div class="p-3 border-b border-gray-700 bg-black/50">
            <h3 class="text-cp-cyan font-cyber m-0">IN PROGRESS</h3>
        </div>
        <div id="active-list" class="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin"></div>
    `;

    layout.appendChild(availableCol);
    layout.appendChild(activeCol);
    container.appendChild(layout);

    // Refresh Button
    availableCol.querySelector('#refresh-missions')?.addEventListener('click', () => {
        audioManager.playClick();
        refreshMissions();
        renderMissionsTab(container, modalContainer);
    });

    const availableList = availableCol.querySelector('#available-list')!;
    const activeList = activeCol.querySelector('#active-list')!;

    // Render Available
    const available = state.availableMissions;
    if (available.length === 0) {
        availableList.innerHTML = '<div class="text-gray-500 text-center p-5 italic">No jobs available. Check back later.</div>';
    } else {
        available.forEach(mission => {
            const el = document.createElement('div');
            el.className = 'bg-black/60 border border-gray-600 p-3 hover:border-cp-yellow hover:bg-cp-yellow/5 transition-all cursor-pointer group relative overflow-hidden';

            // Difficulty Stars
            const stars = '★'.repeat(Math.ceil(mission.difficultyRating / 20));

            el.innerHTML = `
                <div class="flex justify-between items-start mb-1 relative z-10">
                    <div class="font-bold text-white font-cyber group-hover:text-cp-yellow transition-colors">${mission.name}</div>
                    <div class="text-xs text-cp-yellow tracking-widest">${stars}</div>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-400 relative z-10">
                    <span class="uppercase text-cp-cyan">${mission.type}</span>
                    <span>${mission.eddiesMin}-${mission.eddiesMax}€</span>
                </div>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-cp-yellow/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
            `;

            el.addEventListener('click', () => {
                audioManager.playClick();
                openMissionDetail(mission, modalContainer);
            });
            availableList.appendChild(el);
        });
    }

    // Render Active
    const active = state.activeMissions;
    if (active.length === 0) {
        activeList.innerHTML = '<div class="text-gray-500 text-center p-5 italic">No active missions.</div>';
    } else {
        active.forEach(activeMission => {
            const mission = activeMission.mission;
            const el = document.createElement('div');
            el.className = 'bg-black/60 border border-cp-cyan p-3 relative overflow-hidden';
            el.dataset.id = activeMission.id.toString();

            el.innerHTML = `
                <div class="flex justify-between items-start mb-2 relative z-10">
                    <div class="font-bold text-white font-cyber">${mission.name}</div>
                    <div class="text-xs text-cp-cyan animate-pulse">IN PROGRESS</div>
                </div>
                <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative z-10">
                    <div class="progress-bar h-full bg-cp-cyan shadow-[0_0_10px_var(--cp-cyan)]" style="width: 0%"></div>
                </div>
                <div class="flex justify-between items-center mt-1 text-[10px] text-gray-400 relative z-10">
                    <span class="timer-text">00:00</span>
                    <span>${Math.round(mission.duration / 1000)}s</span>
                </div>
            `;
            activeList.appendChild(el);
        });
    }

    // Timer Logic
    const updateTimer = () => {
        if (!document.body.contains(layout)) return; // Stop if removed

        const now = Date.now();
        const activeEls = activeList.querySelectorAll('[data-id]');

        activeEls.forEach(el => {
            const id = (el as HTMLElement).dataset.id;
            const activeMission = state.activeMissions.find(m => m.id.toString() === id);
            if (activeMission) {
                const mission = activeMission.mission;
                const endTime = activeMission.endTime;
                const remaining = Math.max(0, endTime - now);
                const progress = 1 - (remaining / mission.duration);

                const bar = el.querySelector('.progress-bar') as HTMLElement;
                const text = el.querySelector('.timer-text') as HTMLElement;

                bar.style.width = `${progress * 100}%`;
                text.textContent = `${(remaining / 1000).toFixed(1)}s`;
            }
        });

        requestAnimationFrame(updateTimer);
    };

    if (active.length > 0) {
        requestAnimationFrame(updateTimer);
    }
}

export function openMissionDetail(mission: Mission, modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-yellow shadow-[0_0_40px_rgba(252,238,10,0.4)] w-[95%] max-w-[800px] h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
    <div class="bg-cp-yellow/10 border-b-2 border-cp-yellow p-4 flex justify-between items-center shrink-0">
      <h2 class="text-cp-yellow m-0 text-xl md:text-3xl drop-shadow-[0_0_10px_var(--cp-yellow)] font-cyber font-bold truncate pr-4">${mission.name}</h2>
      <button id="close-detail" class="bg-transparent border-2 border-cp-red text-cp-red text-2xl w-8 h-8 md:w-10 md:h-10 cursor-pointer transition-all duration-300 hover:bg-cp-red hover:text-white hover:rotate-90 flex items-center justify-center font-bold shrink-0">&times;</button>
    </div>

    <div class="flex flex-col md:flex-row flex-1 overflow-hidden p-4 gap-4">
      <!-- Left Column: Mission Info -->
      <div class="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 min-w-0">
          <div class="shrink-0">
            <div class="flex justify-between items-center mb-2">
              <span class="inline-block px-2 py-1 text-sm font-bold rounded bg-cp-black border border-cp-yellow text-cp-yellow">
                ${mission.difficulty}
              </span>
              <div class="text-cp-yellow text-sm font-cyber">${mission.type}</div>
            </div>
            
            <div class="text-white text-sm leading-snug mb-3 p-3 bg-black/30 border-l-[3px] border-cp-yellow italic font-cyber">
              "${mission.description}"
            </div>
          </div>

          <!-- Mission Stats Grid -->
          <div class="grid grid-cols-2 gap-2 shrink-0">
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex flex-col justify-center items-center gap-1">
              <div class="text-cp-cyan text-[10px] font-bold tracking-wider">REWARD</div>
              <div class="text-white text-base font-cyber font-bold text-shadow-neon">${mission.eddiesMin}-${mission.eddiesMax}€</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex flex-col justify-center items-center gap-1">
              <div class="text-cp-cyan text-[10px] font-bold tracking-wider">XP</div>
              <div class="text-white text-base font-cyber font-bold text-shadow-neon">${mission.xpMin}-${mission.xpMax}</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex flex-col justify-center items-center gap-1">
              <div class="text-cp-cyan text-[10px] font-bold tracking-wider">TIME</div>
              <div class="text-white text-base font-cyber font-bold text-shadow-neon">${mission.duration / 1000}s</div>
            </div>
            <div class="bg-cp-cyan/5 border border-cp-cyan/30 p-2 flex flex-col justify-center items-center gap-1">
              <div class="text-cp-cyan text-[10px] font-bold tracking-wider">RISK</div>
              <div class="text-white text-base font-cyber font-bold text-shadow-neon">${Math.round(mission.injuryChance * 100)}%</div>
            </div>
          </div>

          <!-- Prediction Stats -->
          <div class="bg-black/40 border border-gray-700 p-3 mt-1 shrink-0">
             <div class="flex justify-between items-center mb-1">
                <span class="text-gray-400 text-xs">TEAM POWER</span>
                <span id="team-power" class="text-cp-cyan font-bold">0</span>
             </div>
             <div class="flex justify-between items-center mb-1">
                <span class="text-gray-400 text-xs">WIN CHANCE</span>
                <span id="win-chance" class="text-white font-bold">0%</span>
             </div>
             <div class="w-full h-2 bg-gray-800 mt-1 mb-2">
                <div id="win-bar" class="h-full bg-cp-cyan transition-all duration-300" style="width: 0%"></div>
             </div>
             <div class="flex justify-between items-center">
                <span class="text-gray-400 text-xs">INJURY RISK</span>
                <span id="injury-risk" class="text-cp-red font-bold">--</span>
             </div>
          </div>
          
          <div id="active-passives" class="flex flex-col gap-1 mt-1 text-xs"></div>
      </div>

      <!-- Right Column: Crew Selection -->
      <div class="flex-1 flex flex-col h-full overflow-hidden md:border-l md:border-cp-cyan/30 md:pl-4 min-w-0">
        <div class="flex justify-between items-center mb-2 shrink-0">
          <h3 class="text-cp-yellow m-0 font-cyber text-base font-bold">SELECT CREW</h3>
          <div class="flex gap-2 items-center">
            <button id="auto-fill-btn" class="cyber-btn text-[10px] py-1 px-2 h-6 flex items-center">AUTO-FILL</button>
            <span class="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded border border-gray-700">MAX 3</span>
          </div>
        </div>
        
        <div id="crew-list" class="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          <!-- Crew members go here -->
        </div>
      </div>
    </div>

    <div class="border-t-2 border-cp-cyan p-4 flex justify-between items-center bg-black/30 shrink-0 relative overflow-hidden">
        <div class="text-cp-yellow text-lg font-bold font-cyber z-10">
          SELECTED: <span id="selected-count">0</span>/3
        </div>
        
        <!-- Biker Animation (Hidden by default) -->
        <div id="mission-biker" class="absolute left-0 bottom-0 h-full w-[120px] pointer-events-none opacity-0 z-0 transform -translate-x-full">
           <img src="assets/biker.png" class="w-full h-full object-contain drop-shadow-[0_0_5px_var(--cp-cyan)]" />
        </div>

        <button id="send-crew-btn" class="cyber-btn px-4 py-2 text-base md:px-8 md:py-3 md:text-lg disabled:opacity-50 disabled:cursor-not-allowed z-10">
          SEND CREW
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    let selectedMemberIds: number[] = [];
    const sendBtn = modal.querySelector('#send-crew-btn') as HTMLButtonElement;
    const selectedCountEl = modal.querySelector('#selected-count')!;
    const bikerAnim = modal.querySelector('#mission-biker') as HTMLElement;

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
            const passiveContainer = modal.querySelector('#active-passives');
            if (passiveContainer) passiveContainer.innerHTML = '';
            return;
        }

        // Calculate Power
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
            return `<div class="text-[10px] text-cp-cyan truncate">• ${m.name}: ${info.passive}</div>`;
        }).join('');

        const passiveContainer = modal.querySelector('#active-passives');
        if (passiveContainer) passiveContainer.innerHTML = passivesList;
    };

    // Render Crew Function
    const renderCrewList = () => {
        const crewList = modal.querySelector('#crew-list')!;
        crewList.innerHTML = '';
        const state = gameStore.get();
        const availableMembers = state.members.filter(m => m.status === 'IDLE' && !m.injured);

        if (availableMembers.length === 0) {
            crewList.innerHTML = '<div class="text-cp-red text-center p-5 font-cyber text-sm">NO AVAILABLE MEMBERS</div>';
        } else {
            availableMembers.forEach(member => {
                const el = document.createElement('div');
                el.className = 'flex items-center gap-3 p-2 bg-black/40 border border-[#555] cursor-pointer transition-all duration-300 hover:bg-cp-cyan/10 hover:translate-x-1 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]';

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

                // Check if selected
                const isSelected = selectedMemberIds.includes(member.id);
                if (isSelected) {
                    el.classList.add('bg-cp-cyan/20', 'border-cp-yellow', 'shadow-[0_0_20px_rgba(252,238,10,0.4)]');
                }

                el.innerHTML = `
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1">
                <div class="font-bold text-white font-cyber text-sm truncate">${member.name}</div>
                <div class="text-[10px] text-cp-yellow font-cyber whitespace-nowrap">LVL ${member.level}</div>
              </div>
              <div class="flex gap-2 text-[10px] text-gray-400 font-mono">
                <span>COOL: <span class="${member.stats.cool >= (mission.minCool || 0) ? 'text-cp-cyan' : 'text-red-500'}">${member.stats.cool}</span></span>
                <span>REF: <span class="${member.stats.reflex >= (mission.minReflex || 0) ? 'text-cp-cyan' : 'text-red-500'}">${member.stats.reflex}</span></span>
              </div>
            </div>
            <div class="w-5 h-5 border border-cp-cyan flex items-center justify-center text-xs check-box transition-all shrink-0 ${isSelected ? 'bg-cp-yellow border-cp-yellow' : ''}">${isSelected ? '✓' : ''}</div>
          `;

                if (qualified) {
                    el.addEventListener('click', () => {
                        audioManager.playClick();
                        const index = selectedMemberIds.indexOf(member.id);

                        if (index > -1) {
                            // Deselect
                            selectedMemberIds.splice(index, 1);
                        } else {
                            // Select (Max 3)
                            if (selectedMemberIds.length >= 3) {
                                showToast('MAX 3 MEMBERS', 'warning');
                                return;
                            }
                            selectedMemberIds.push(member.id);
                        }

                        // Update UI State
                        selectedCountEl.textContent = selectedMemberIds.length.toString();
                        sendBtn.disabled = selectedMemberIds.length === 0;
                        updateStats();
                        renderCrewList(); // Re-render to update visuals
                    });
                }

                crewList.appendChild(el);
            });
        }
    };

    // Initial Render
    renderCrewList();

    // Listeners
    modal.querySelector('#close-detail')?.addEventListener('click', () => overlay.remove());

    // Auto-Fill Logic
    modal.querySelector('#auto-fill-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        const state = gameStore.get();

        // Filter available members
        const available = state.members.filter(m => m.status === 'IDLE' && !m.injured);

        // Determine best stat based on mission type
        let sortFn = (_a: any, _b: any) => 0;

        if (['HEIST', 'DEBT', 'PROTECTION', 'BOUNTY'].includes(mission.type)) {
            sortFn = (a, b) => b.stats.cool - a.stats.cool;
        } else {
            sortFn = (a, b) => b.stats.reflex - a.stats.reflex;
        }

        // Sort and take top 3
        const best = available.sort(sortFn).slice(0, 3);

        // Update selection
        selectedMemberIds = best.map(m => m.id);

        // Update UI
        selectedCountEl.textContent = selectedMemberIds.length.toString();
        sendBtn.disabled = selectedMemberIds.length === 0;
        updateStats();
        renderCrewList();

        showToast(`AUTO-FILLED ${selectedMemberIds.length} MEMBERS`, 'success');
    });

    sendBtn.addEventListener('click', () => {
        audioManager.playClick();
        if (selectedMemberIds.length > 0) {
            // Disable button
            sendBtn.disabled = true;
            sendBtn.textContent = 'SENDING...';

            // Trigger Animation
            bikerAnim.style.opacity = '1';
            bikerAnim.animate([
                { transform: 'translateX(-100%)' },
                { transform: 'translateX(1000px)' }
            ], {
                duration: 1500,
                easing: 'ease-in'
            });

            // Wait a bit for effect
            setTimeout(() => {
                const result = startMission(selectedMemberIds, mission.id);
                if (result.success) {
                    audioManager.playPurchase();
                    showToast('MISSION STARTED', 'success');
                    sendBtn.textContent = 'SENT!';
                    // Close the modal after a brief delay
                    setTimeout(() => overlay.remove(), 800);
                } else {
                    showToast(result.reason || 'FAILED', 'error');
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'SEND CREW';
                    bikerAnim.style.opacity = '0'; // Reset animation visibility
                }
            }, 1000);
        }
    });
}

export function showMissionDebriefModal(detail: any) {
    const { rewards, leveledUp, injured, mission, success, memberIds } = detail;
    const overlay = createOverlay();
    overlay.style.zIndex = '100000';

    const modal = document.createElement('div');
    modal.className = `bg-cp-bg border-[3px] ${success ? 'border-cp-cyan' : 'border-cp-red'} shadow-[0_0_60px_rgba(0,0,0,0.8)] w-[90%] max-w-[600px] flex flex-col animate-modalSlideIn pointer-events-auto`;

    const state = gameStore.get();
    const members = state.members.filter(m => memberIds.includes(m.id));

    modal.innerHTML = `
      <div class="${success ? 'bg-cp-cyan/20 border-cp-cyan' : 'bg-cp-red/20 border-cp-red'} border-b-2 p-5 text-center">
        <h2 class="${success ? 'text-cp-cyan' : 'text-cp-red'} m-0 text-3xl drop-shadow-[0_0_10px_currentColor] font-cyber font-bold uppercase">
          ${success ? 'MISSION SUCCESS' : 'MISSION FAILED'}
        </h2>
        <div class="text-white font-cyber text-sm mt-1 tracking-wider">${mission.name}</div>
      </div>
      
      <div class="p-6 flex flex-col gap-6">
        <!-- Rewards -->
        <div class="flex justify-center gap-4">
           <div class="bg-black/40 border border-[#333] p-3 min-w-[100px] text-center">
              <div class="text-xs text-gray-400 font-bold mb-1">EDDIES</div>
              <div class="text-xl font-cyber ${rewards.eddies > 0 ? 'text-cp-yellow' : 'text-gray-500'}">${rewards.eddies}€</div>
           </div>
           <div class="bg-black/40 border border-[#333] p-3 min-w-[100px] text-center">
              <div class="text-xs text-gray-400 font-bold mb-1">REP</div>
              <div class="text-xl font-cyber ${rewards.rep > 0 ? 'text-cp-cyan' : 'text-gray-500'}">+${rewards.rep}</div>
           </div>
           <div class="bg-black/40 border border-[#333] p-3 min-w-[100px] text-center">
              <div class="text-xs text-gray-400 font-bold mb-1">XP</div>
              <div class="text-xl font-cyber text-white">+${rewards.xp}</div>
           </div>
        </div>

        <!-- Team Status -->
        <div class="flex flex-col gap-2">
           <h3 class="text-cp-cyan font-cyber text-sm font-bold border-b border-gray-700 pb-1 mb-2">TEAM REPORT</h3>
           ${members.map(m => {
        const isLeveledUp = leveledUp.includes(m.id);
        const isInjured = injured.includes(m.id);
        return `
               <div class="flex items-center justify-between bg-black/30 p-2 border-l-2 ${isInjured ? 'border-cp-red' : (isLeveledUp ? 'border-cp-yellow' : 'border-gray-600')}">
                 <div class="flex items-center gap-3">
                    <div class="font-bold text-white font-cyber">${m.name}</div>
                    ${isLeveledUp ? '<span class="text-[10px] bg-cp-yellow text-black px-1 font-bold rounded animate-pulse">LEVEL UP!</span>' : ''}
                    ${isInjured ? '<span class="text-[10px] bg-cp-red text-white px-1 font-bold rounded">INJURED</span>' : ''}
                 </div>
                 <div class="text-xs text-gray-400">
                    LVL ${m.level}
                 </div>
               </div>
             `;
    }).join('')}
        </div>
      </div>

      <div class="border-t-2 ${success ? 'border-cp-cyan' : 'border-cp-red'} p-5">
        <button id="dismiss-debrief" class="cyber-btn w-full py-3 text-xl">DISMISS</button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    modal.querySelector('#dismiss-debrief')?.addEventListener('click', () => {
        audioManager.playClick();
        overlay.remove();
    });
}

export function showMissionReward(detail: any) {
    const { success } = detail;

    if (success) {
        audioManager.playMissionComplete();
    } else {
        audioManager.playInjury(); // Or failure sound
    }

    if (detail.leveledUp && detail.leveledUp.length > 0) {
        audioManager.playLevelUp();
    }

    showMissionDebriefModal(detail);
}
