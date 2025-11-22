export class MissionUIManager {
    constructor(gameManager, uiManager) {
        this.gm = gameManager;
        this.ui = uiManager;
        this.audio = uiManager.audio;
        this.activeTimers = []; // Track active timer intervals for cleanup
    }

    render(container) {
        // Clear all active timers before re-rendering
        this.activeTimers.forEach(timerId => clearInterval(timerId));
        this.activeTimers = [];

        container.innerHTML = ''; // Clear container to prevent duplication

        // Header
        const header = document.createElement('div');
        header.className = 'territory-header';
        header.innerHTML = `<h3>MISSION BOARD</h3><p>Select missions and send your riders</p>`;
        container.appendChild(header);

        // Refresh Missions Button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'cyber-btn small-btn';
        refreshBtn.innerHTML = 'REFRESH MISSIONS (50€)';
        refreshBtn.style.marginBottom = '15px';
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'REFRESHING...';

            setTimeout(() => {
                if (this.gm.refreshMissions()) {
                    if (this.audio) this.audio.playClick();
                    this.ui.log('NEW MISSIONS AVAILABLE!', 'good');
                    // Render is called by notify(), but we can force it here too if needed
                    // this.render(container); 
                } else {
                    if (this.audio) this.audio.playError();
                    this.ui.log('INSUFFICIENT FUNDS.', 'bad');
                }
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = 'REFRESH MISSIONS (50€)';
            }, 300); // Small fake delay for "feel"
        });
        container.appendChild(refreshBtn);

        // Active Missions Section
        if (this.gm.activeMissions.length > 0) {
            const activeHeader = document.createElement('h4');
            activeHeader.style.color = 'var(--cp-cyan)';
            activeHeader.style.margin = '15px 0 10px 0';
            activeHeader.textContent = 'ACTIVE MISSIONS';
            container.appendChild(activeHeader);

            this.gm.activeMissions.forEach(activeMission => {
                const member = this.gm.members.find(m => m.id === activeMission.memberId);
                if (!member) return;

                const progress = this.gm.getMissionProgress(member.id);
                if (!progress) return;

                const activeCard = document.createElement('div');
                activeCard.className = 'mission-card active-mission-card';
                activeCard.innerHTML = `
                    <div class="mission-header">
                        <div class="mission-name">${activeMission.mission.name}</div>
                        <div class="mission-type">[${activeMission.mission.type}]</div>
                    </div>
                    <div class="mission-member-info">
                        <span class="member-name">${member.name}</span>
                        <span class="member-level">LVL ${member.level}</span>
                    </div>
                    <div class="mission-progress-container">
                        <div class="mission-progress-bar" style="width: ${progress.progress * 100}%"></div>
                        <div class="mission-timer">${progress.remainingSeconds}s remaining</div>
                    </div>
                `;
                container.appendChild(activeCard);

                // Update timer every second
                const timerId = setInterval(() => {
                    // Check if element is still in DOM
                    if (!document.body.contains(activeCard)) {
                        clearInterval(timerId);
                        return;
                    }

                    const newProgress = this.gm.getMissionProgress(member.id);
                    if (!newProgress) {
                        clearInterval(timerId);
                        // Remove from active timers
                        const index = this.activeTimers.indexOf(timerId);
                        if (index > -1) this.activeTimers.splice(index, 1);

                        const timerEl = activeCard.querySelector('.mission-timer');
                        if (timerEl) timerEl.textContent = 'COMPLETED';
                        return;
                    }
                    const progressBar = activeCard.querySelector('.mission-progress-bar');
                    const timerEl = activeCard.querySelector('.mission-timer');
                    if (progressBar && timerEl) {
                        progressBar.style.width = `${newProgress.progress * 100}%`;
                        timerEl.textContent = `${newProgress.remainingSeconds}s remaining`;
                    }
                }, 1000);

                // Track this timer for cleanup
                this.activeTimers.push(timerId);
            });
        }

        // Available Missions Section
        const availHeader = document.createElement('h4');
        availHeader.style.color = 'var(--cp-yellow)';
        availHeader.style.margin = '20px 0 10px 0';
        availHeader.textContent = 'AVAILABLE MISSIONS';
        container.appendChild(availHeader);

        if (this.gm.availableMissions.length === 0) {
            const notice = document.createElement('div');
            notice.className = 'recruitment-text';
            notice.textContent = 'NO MISSIONS AVAILABLE. REFRESH FOR NEW ONES!';
            container.appendChild(notice);
            return;
        }

        // Compact mission cards
        this.gm.availableMissions.forEach((mission, index) => {
            const card = document.createElement('div');
            card.className = 'mission-card-compact';
            card.style.animationDelay = `${index * 0.1}s`;

            const difficultyClass = `mission-difficulty-${mission.difficulty.toLowerCase()}`;
            const durationSec = mission.duration / 1000;

            card.innerHTML = `
                <div class="mission-header">
                    <div class="mission-name">${mission.name}</div>
                    <div class="mission-difficulty ${difficultyClass}">${mission.difficulty}</div>
                </div>
                <div class="mission-rewards-compact">
                    <span>💰 ${mission.eddiesMin}-${mission.eddiesMax}€</span>
                    <span>⭐ ${mission.xpMin}-${mission.xpMax} XP</span>
                    <span>⏱ ${durationSec}s</span>
                </div>
            `;

            card.addEventListener('click', () => {
                if (this.audio) this.audio.playClick();
                this.showMissionModal(mission);
            });

            container.appendChild(card);
        });
    }


    showMissionModal(mission) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'mission-modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        const modalContent = document.createElement('div');
        modalContent.className = 'mission-modal';

        const difficultyClass = `mission-difficulty-${mission.difficulty.toLowerCase()}`;
        const durationSec = mission.duration / 1000;
        let durationLabel = 'QUICK';
        if (durationSec >= 40) durationLabel = 'EXTENDED';
        else if (durationSec >= 20) durationLabel = 'LONG';
        else if (durationSec >= 10) durationLabel = 'MEDIUM';

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>${mission.name}</h2>
                <button class="modal-close">×</button>
            </div>
            <div class="mission-modal-body">
                <div class="mission-details">
                    <div class="mission-difficulty-large ${difficultyClass}">${mission.difficulty}</div>
                    <div class="mission-type-large">[${mission.type}] • ${durationLabel}</div>
                    <div class="mission-description">${mission.description || 'No description available.'}</div>
                     <div class="mission-info-grid">
                        <div class="info-item">
                            <div class="info-label">PAYOUT</div>
                            <div class="info-value">💰 ${mission.eddiesMin}-${mission.eddiesMax}€</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">EXPERIENCE</div>
                            <div class="info-value">⭐ ${mission.xpMin}-${mission.xpMax} XP</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">REPUTATION</div>
                           <div class="info-value">🏴 +${mission.rep} REP</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">DURATION</div>
                            <div class="info-value">⏱ ${durationSec}s</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">INJURY RISK</div>
                            <div class="info-value">⚠ ${Math.round(mission.injuryChance * 100)}%</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">REQUIREMENTS</div>
                            <div class="info-value">LVL ${mission.minLevel}${mission.minCool ? ` COOL ${mission.minCool}+` : ''}${mission.minReflex ? ` REF ${mission.minReflex}+` : ''}</div>
                        </div>
                    </div>
                </div>
                <div class="crew-selection">
                    <h3>SELECT CREW</h3>
                    <div class="crew-members" id="crew-members"></div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="selected-count">0 SELECTED</div>
                <button class="cyber-btn" id="send-crew-btn" disabled>SEND CREW</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close button
        modalContent.querySelector('.modal-close').onclick = () => {
            modal.remove();
            // Refresh the mission list in case a mission was started or just to be safe
            if (this.ui.activeTab === 'missions' && this.ui.activeTabContent) {
                this.render(this.ui.activeTabContent);
            }
        };

        // Populate crew members
        const crewContainer = modalContent.querySelector('#crew-members');
        const availableMembers = this.gm.members.filter(m => m.status === 'IDLE' && !m.injured);
        const selectedMembers = [];

        if (availableMembers.length === 0) {
            crewContainer.innerHTML = '<div class="no-members">NO AVAILABLE MEMBERS</div>';
            return;
        }

        availableMembers.forEach(member => {
            const qualified = this.gm.memberMeetsMissionRequirements(member.id, mission.id);

            const memberCard = document.createElement('div');
            memberCard.className = `crew-member-card ${qualified ? 'qualified' : 'unqualified'}`;
            memberCard.dataset.memberId = member.id;

            memberCard.innerHTML = `
                <div class="member-avatar">${member.name.charAt(0)}</div>
                <div class="member-details">
                    <div class="member-name">${member.name}</div>
                    <div class="member-stats-row">
                        <span>LVL ${member.level}</span>
                        <span>COOL: ${member.stats.cool}</span>
                        <span>REF: ${member.stats.reflex}</span>
                    </div>
                </div>
                ${qualified
                    ? '<div class="member-check-box" style="width: 30px; height: 30px; border: 2px solid var(--cp-cyan); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"></div>'
                    : '<div class="member-unqualified">✗</div>'}
            `;

            if (qualified) {
                memberCard.onclick = () => {
                    const index = selectedMembers.indexOf(member.id);
                    const checkBox = memberCard.querySelector('.member-check-box');

                    if (index > -1) {
                        selectedMembers.splice(index, 1);
                        memberCard.classList.remove('selected');
                        checkBox.textContent = '';
                        checkBox.style.backgroundColor = 'transparent';
                        checkBox.style.color = 'inherit';
                    } else {
                        selectedMembers.push(member.id);
                        memberCard.classList.add('selected');
                        checkBox.textContent = '✓';
                        checkBox.style.backgroundColor = 'var(--cp-yellow)';
                        checkBox.style.color = '#000';
                    }

                    // Update UI
                    const countEl = modalContent.querySelector('.selected-count');
                    const sendBtn = modalContent.querySelector('#send-crew-btn');
                    countEl.textContent = `${selectedMembers.length} SELECTED`;
                    sendBtn.disabled = selectedMembers.length === 0;
                };
            }

            crewContainer.appendChild(memberCard);
        });

        // Send crew button
        const sendBtn = modalContent.querySelector('#send-crew-btn');
        sendBtn.onclick = async () => {
            if (selectedMembers.length === 0) return;

            try {
                // Disable button and show feedback
                sendBtn.disabled = true;
                sendBtn.textContent = 'SENDING...';
                sendBtn.style.opacity = '0.6';

                // Small delay to show "Sending..." state
                await new Promise(resolve => setTimeout(resolve, 500));

                // Send all selected members on the mission
                let successCount = 0;
                let failReason = '';

                selectedMembers.forEach(memberId => {
                    const result = this.gm.startMission(memberId, mission.id);
                    if (result && result.success) {
                        successCount++;
                    } else {
                        failReason = result ? result.reason : 'Unknown error';
                    }
                });

                if (successCount > 0) {
                    // Remove the mission from available list now that crew is sent
                    if (this.gm.removeMission) {
                        this.gm.removeMission(mission.id);
                    } else {
                        console.error("GameManager.removeMission is missing!");
                    }

                    if (this.audio) this.audio.playClick();
                    this.ui.log(`${successCount} MEMBER(S) SENT ON ${mission.name}!`, 'good');

                    // Show success feedback - FORCE UPDATE
                    sendBtn.textContent = 'SENT!';
                    sendBtn.style.backgroundColor = 'var(--cp-green)';
                    sendBtn.style.color = '#000';
                    sendBtn.style.opacity = '1';

                    // Trigger biker animation
                    this.ui.missionJustStarted = true;

                } else {
                    if (this.audio) this.audio.playError();
                    this.ui.log(`FAILED: ${failReason}`, 'bad');

                    // Re-enable button on failure
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'SEND CREW';
                    sendBtn.style.opacity = '1';
                    sendBtn.style.backgroundColor = ''; // Reset
                    sendBtn.style.color = ''; // Reset
                }
            } catch (err) {
                console.error("Error in send button handler:", err);
                this.ui.log(`ERROR: ${err.message}`, 'bad'); // Show error to user
                sendBtn.disabled = false;
                sendBtn.textContent = 'ERROR';
                setTimeout(() => sendBtn.textContent = 'SEND CREW', 2000);
            }
        };
    }
}
