export class UIManager {
    constructor(gameManager, audioManager) {
        this.gm = gameManager;
        this.audio = audioManager;
        this.missionJustStarted = false;
        this.activeTab = null;
        this.activeTabContent = null;

        // Elements
        this.eddiesEl = document.querySelector('#eddies-display .val');
        this.repEl = document.querySelector('#rep-display .val');
        this.panelContainer = document.getElementById('panel-container');
        this.panelTitle = document.getElementById('panel-title');
        this.panelContent = document.getElementById('panel-content');
        this.closeBtn = document.getElementById('close-btn');
        this.logEl = document.getElementById('log-display');

        // Prevent click-through on panel
        this.panelContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Events
        this.closeBtn.addEventListener('click', () => this.closePanel());

        window.addEventListener('building-click', (e) => {
            // Block interaction if panel is already open
            if (this.panelContainer.style.display === 'flex') return;
            this.openPanel(e.detail.type);
        });

        window.addEventListener('mission-complete', (e) => {
            const { member, rewards, leveledUp, injured } = e.detail;
            this.log(`${member.name} RETURNED! +${rewards.eddies}€ +${rewards.xp}XP`, 'good');
            if (injured) {
                this.log(`⚠ ${member.name} IS INJURED! Visit Ripperdoc.`, 'bad');
                if (this.audio) this.audio.playInjury();
            } else if (leveledUp) {
                this.log(`★ ${member.name} LEVELED UP TO LVL ${member.level}! ★`, 'good');
                if (this.audio) this.audio.playLevelUp();
            } else {
                if (this.audio) this.audio.playMissionComplete();
            }

            // Auto-update roster if open
            if (this.panelContainer.style.display === 'flex' && this.activeTab === 'roster') {
                this.refreshRoster();
            }
        });

        window.addEventListener('territory-income', (e) => {
            this.log(`TERRITORY INCOME: +${e.detail.amount}€`, 'good');
        });

        window.addEventListener('game-event', (e) => {
            this.log(e.detail.message, e.detail.type);
            if (e.detail.type === 'bad' && this.audio) this.audio.playError();
            if (e.detail.type === 'good' && this.audio) this.audio.playPurchase();
        });

        // Subscribe
        this.gm.subscribe((state) => this.render(state));
    }

    render(state) {
        // Animated counter effect
        this.animateCounter(this.eddiesEl, state.eddies);
        this.animateCounter(this.repEl, state.rep);
    }

    animateCounter(element, newValue) {
        const oldValue = parseInt(element.textContent) || 0;
        if (oldValue === newValue) return;

        const isIncrease = newValue > oldValue;
        const diff = newValue - oldValue;

        const duration = 500;
        const steps = 20;
        const increment = (newValue - oldValue) / steps;
        let current = oldValue;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            current += increment;
            element.textContent = Math.round(current);

            if (step >= steps) {
                element.textContent = newValue;
                clearInterval(interval);

                // Pulse effect on change
                element.parentElement.classList.add('pulse');
                setTimeout(() => element.parentElement.classList.remove('pulse'), 300);

                // Floating indicator for eddies increase
                if (isIncrease && element === this.eddiesEl) {
                    this.showFloatingEddies(diff);
                }
            }
        }, duration / steps);
    }

    showFloatingEddies(amount) {
        const indicator = document.createElement('div');
        indicator.className = 'floating-eddies';
        indicator.textContent = `+${amount}€`;

        // Position near the eddies display
        const eddiesDisplay = document.getElementById('eddies-display');
        const rect = eddiesDisplay.getBoundingClientRect();

        indicator.style.left = `${rect.left + rect.width / 2}px`;
        indicator.style.top = `${rect.top}px`;

        document.body.appendChild(indicator);

        // Add sparkle effect
        this.createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);

        // Remove after animation
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    createSparkles(x, y) {
        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.left = `${x}px`;
            sparkle.style.top = `${y}px`;

            // Random offset for each sparkle
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            sparkle.style.setProperty('--offset-x', `${offsetX}px`);
            sparkle.style.setProperty('--offset-y', `${offsetY}px`);

            document.body.appendChild(sparkle);

            setTimeout(() => sparkle.remove(), 1000);
        }
    }

    openPanel(type) {
        if (this.audio) this.audio.playPanelOpen();
        this.panelContainer.style.display = 'flex';
        this.panelContent.innerHTML = '';
        this.activeTab = null;
        this.activeTabContent = null;

        if (type === 'hideout') {
            this.panelTitle.textContent = 'GANG HQ';
            this.renderHQ();
        } else if (type === 'bar') {
            this.panelTitle.textContent = 'THE AFTERLIFE';
            this.renderRecruitment();
        } else if (type === 'ripperdoc') {
            this.panelTitle.textContent = 'RIPPERDOC';
            this.renderRipperdoc();
        }
    }

    closePanel() {
        if (this.audio) this.audio.playPanelClose();
        this.panelContainer.style.display = 'none';
        this.activeTab = null;
        this.activeTabContent = null;
    }

    renderHQ() {
        // Tabs
        const tabs = document.createElement('div');
        tabs.className = 'tabs';
        tabs.innerHTML = `
            <button class="tab-btn active" data-tab="roster">ROSTER</button>
            <button class="tab-btn" data-tab="territory">TERRITORY</button>
            <button class="tab-btn" data-tab="gangs">GANGS</button>
        `;
        this.panelContent.appendChild(tabs);

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        this.panelContent.appendChild(tabContent);

        // Set initial state
        this.activeTab = 'roster';
        this.activeTabContent = tabContent;

        // Tab switching
        tabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.tab === 'roster') {
                    this.activeTab = 'roster';
                    tabContent.innerHTML = '';
                    this.renderRoster(tabContent);
                } else if (btn.dataset.tab === 'territory') {
                    this.activeTab = 'territory';
                    tabContent.innerHTML = '';
                    this.renderTerritory(tabContent);
                } else if (btn.dataset.tab === 'gangs') {
                    this.activeTab = 'gangs';
                    tabContent.innerHTML = '';
                    this.renderGangs(tabContent);
                }
            });
        });

        // Initial render
        this.renderRoster(tabContent);
    }

    refreshRoster() {
        if (this.activeTabContent) {
            this.activeTabContent.innerHTML = '';
            this.renderRoster(this.activeTabContent);
        }
    }

    renderRoster(container) {
        // Biker Animation Section (Only on Roster)
        const bikerSection = document.createElement('div');
        bikerSection.className = 'biker-animation-section';
        bikerSection.style.display = 'block'; // Ensure it's visible
        bikerSection.innerHTML = `
            <div class="biker-container">
                <img src="assets/biker.png" class="biker-sprite" alt="Biker">
            </div>
        `;

        // Check if we should trigger the animation
        if (this.missionJustStarted) {
            const container = bikerSection.querySelector('.biker-container');
            container.classList.add('riding');
            this.missionJustStarted = false; // Reset flag
        }

        container.appendChild(bikerSection);

        if (this.gm.members.length === 0) {
            container.innerHTML += '<div class="recruitment-text">NO GANG MEMBERS. RECRUIT SOME AT THE BAR!</div>';
            return;
        }

        this.gm.members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'member-card';

            let statusClass = 'status-idle';
            if (member.injured) statusClass = 'status-injured';
            else if (member.status === 'ON MISSION') statusClass = 'status-busy';

            card.innerHTML = `
                <div class="member-header">
                    <span class="member-name">${member.name}</span>
                    <span class="member-level">LVL ${member.level}</span>
                    <span class="member-status ${statusClass}">${member.injured ? 'INJURED' : (member.status === 'ON MISSION' ? 'ON MISSION' : 'IDLE')}</span>
                </div>
                <div class="member-role">${member.role}</div>
                
                <div class="health-bar-container">
                    <div class="health-bar" style="width: ${(member.health / member.maxHealth) * 100}%"></div>
                    <div class="health-text">${member.health}/${member.maxHealth} HP</div>
                </div>

                <div class="xp-bar-container">
                    <div class="xp-bar" style="width: ${(member.xp / member.xpToNext) * 100}%"></div>
                    <div class="xp-text">${member.xp}/${member.xpToNext} XP</div>
                </div>

                <div class="member-stats">
                    <span class="stat">COOL: ${member.stats.cool}</span>
                    <span class="stat">REF: ${member.stats.reflex}</span>
                </div>
            `;

            if (member.status !== 'ON MISSION' && !member.injured) {
                const missionBtn = document.createElement('button');
                missionBtn.className = 'cyber-btn small-btn';
                missionBtn.textContent = 'SEND ON MISSION';
                missionBtn.onclick = () => {
                    if (this.audio) this.audio.playClick();

                    this.gm.startMission(member.id);
                    this.missionJustStarted = true; // Flag to trigger animation on next render
                    this.openPanel('hideout'); // Re-render to show status update
                };
                card.appendChild(missionBtn);
            } else if (member.status === 'ON MISSION') {
                const timer = document.createElement('div');
                timer.className = 'mission-timer';
                timer.textContent = 'MISSION IN PROGRESS...';
                card.appendChild(timer);
            } else if (member.injured) {
                const notice = document.createElement('div');
                notice.className = 'injured-notice';
                notice.textContent = 'NEEDS MEDICAL ATTENTION';
                card.appendChild(notice);
            }

            container.appendChild(card);
        });
    }

    renderTerritory(container) {
        const territories = this.gm.territories;

        const header = document.createElement('div');
        header.className = 'territory-header';
        header.innerHTML = `<h3>NIGHT CITY DISTRICTS</h3><p>Capture territories for passive income</p>`;
        container.appendChild(header);

        territories.forEach((t, index) => {
            const div = document.createElement('div');
            div.className = `territory-card ${t.controlled ? 'controlled' : ''}`;
            div.style.animationDelay = `${index * 0.1}s`;

            const cost = t.income * 10;

            // Check if controlled by rival gang
            const rivalGang = t.rivalGang ? this.gm.rivalGangManager.getGangByTerritory(t.id) : null;

            div.innerHTML = `
                <div class="territory-info">
                    <div class="territory-name">${t.name}</div>
                    <div class="territory-income">+${t.income}€ / 10s</div>
                </div>
                <div class="territory-status">
                    ${t.controlled
                    ? '<span class="status-controlled">✓ CONTROLLED</span>'
                    : rivalGang
                        ? `<span class="status-rival">⚔ ${rivalGang.name}</span>`
                        : `<button class="cyber-btn small-btn" data-id="${t.id}">CAPTURE (${cost}€)</button>`
                }
                </div>
            `;

            if (!t.controlled && !rivalGang) {
                const btn = div.querySelector('button');
                btn.addEventListener('click', () => {
                    if (this.gm.captureTerritory(t.id)) {
                        if (this.audio) this.audio.playPurchase();
                        this.log(`${t.name} CAPTURED!`, 'good');
                        container.innerHTML = ''; // Clear container
                        this.renderTerritory(container); // Re-render
                    } else {
                        if (this.audio) this.audio.playError();
                        this.log('INSUFFICIENT FUNDS.', 'bad');
                    }
                });
            }

            container.appendChild(div);
        });
    }

    renderGangs(container) {
        const header = document.createElement('div');
        header.className = 'territory-header';
        header.innerHTML = `<h3>RIVAL GANGS</h3><p>Attack rival territories to expand your empire</p>`;
        container.appendChild(header);

        const gangs = this.gm.rivalGangManager.getGangInfo();
        const territories = this.gm.territories;

        gangs.forEach((gang, index) => {
            const gangCard = document.createElement('div');
            gangCard.className = 'gang-card';
            gangCard.style.animationDelay = `${index * 0.1}s`;

            gangCard.innerHTML = `
                <div class="gang-header">
                    <div class="gang-name">${gang.name}</div>
                    <div class="gang-stats">
                        <span class="gang-strength">⚔ ${gang.strength}</span>
                        <span class="gang-territories">🏴 ${gang.territories} territories</span>
                    </div>
                </div>
                <div class="gang-personality">[${gang.personality.toUpperCase()}]</div>
            `;

            container.appendChild(gangCard);

            // Show territories controlled by this gang
            const gangTerritories = territories.filter(t => {
                const gangObj = this.gm.rivalGangManager.getGangByTerritory(t.id);
                return gangObj && gangObj.name === gang.name;
            });

            gangTerritories.forEach(t => {
                const territoryDiv = document.createElement('div');
                territoryDiv.className = 'rival-territory-card';

                territoryDiv.innerHTML = `
                    <div class="territory-info">
                        <div class="territory-name">${t.name}</div>
                        <div class="territory-income">+${t.income}€ / 10s</div>
                    </div>
                    <button class="cyber-btn small-btn attack-btn" data-id="${t.id}">ATTACK</button>
                `;

                const attackBtn = territoryDiv.querySelector('.attack-btn');
                attackBtn.addEventListener('click', () => {
                    this.showAttackDialog(t.id, gang.name);
                });

                container.appendChild(territoryDiv);
            });
        });

        if (gangs.length === 0) {
            const notice = document.createElement('div');
            notice.className = 'recruitment-text';
            notice.textContent = 'NO RIVAL GANGS REMAIN. YOU CONTROL NIGHT CITY!';
            container.appendChild(notice);
        }
    }

    showAttackDialog(territoryId, gangName) {
        const territory = this.gm.territories.find(t => t.id === territoryId);
        const availableMembers = this.gm.members.filter(m => m.status === 'IDLE' && !m.injured);

        if (availableMembers.length === 0) {
            this.log('NO AVAILABLE MEMBERS FOR ATTACK!', 'bad');
            if (this.audio) this.audio.playError();
            return;
        }

        // Get gang strength for calculation
        const gang = this.gm.rivalGangManager.getGangByTerritory(territoryId);
        const gangPower = gang.strength;

        // Create attack dialog
        const dialog = document.createElement('div');
        dialog.className = 'attack-dialog';
        dialog.innerHTML = `
            <h3>ATTACK ${territory.name}</h3>
            <p>Target: ${gangName} (Strength: ${gangPower})</p>
            <div class="success-chance-display">
                <div class="chance-label">SUCCESS CHANCE:</div>
                <div class="chance-value" id="success-chance">0%</div>
            </div>
            <div class="member-selection">
                ${availableMembers.map(m => `
                    <label class="member-checkbox">
                        <input type="checkbox" value="${m.id}" data-power="${(m.stats.cool * 2) + (m.stats.reflex * 2) + (m.level * 5)}">
                        <span>${m.name} (LVL ${m.level} - COOL:${m.stats.cool} REF:${m.stats.reflex})</span>
                    </label>
                `).join('')}
            </div>
            <div class="dialog-buttons">
                <button class="cyber-btn" id="confirm-attack">ATTACK</button>
                <button class="cyber-btn" id="cancel-attack">CANCEL</button>
            </div>
        `;

        this.panelContent.appendChild(dialog);

        // Function to calculate and update success chance
        const updateSuccessChance = () => {
            const selected = Array.from(dialog.querySelectorAll('input:checked'));
            const playerPower = selected.reduce((sum, cb) => sum + parseInt(cb.dataset.power), 0);

            // Calculate success chance (same formula as actual attack)
            let successChance = 0;
            if (playerPower > 0) {
                // Add some randomness range to the calculation
                const minChance = Math.min(100, Math.max(0, ((playerPower - 30) / gangPower) * 100));
                const maxChance = Math.min(100, ((playerPower + 30) / gangPower) * 100);
                successChance = Math.round((minChance + maxChance) / 2);
            }

            const chanceEl = dialog.querySelector('#success-chance');
            chanceEl.textContent = `${successChance}%`;

            // Color coding
            if (successChance >= 70) {
                chanceEl.style.color = 'var(--cp-cyan)';
                chanceEl.style.textShadow = '0 0 10px var(--cp-cyan)';
            } else if (successChance >= 40) {
                chanceEl.style.color = 'var(--cp-yellow)';
                chanceEl.style.textShadow = '0 0 10px var(--cp-yellow)';
            } else {
                chanceEl.style.color = 'var(--cp-red)';
                chanceEl.style.textShadow = '0 0 10px var(--cp-red)';
            }
        };

        // Add event listeners to all checkboxes
        dialog.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', updateSuccessChance);
        });

        dialog.querySelector('#confirm-attack').addEventListener('click', () => {
            const selected = Array.from(dialog.querySelectorAll('input:checked')).map(cb => cb.value);

            if (selected.length === 0) {
                this.log('SELECT AT LEAST ONE MEMBER!', 'bad');
                if (this.audio) this.audio.playError();
                return;
            }

            const result = this.gm.attackTerritory(territoryId, selected);

            if (result.success) {
                this.log(result.message, 'good');
                if (this.audio) this.audio.playPurchase();
                if (result.loot) {
                    this.log(`LOOTED ${result.loot}€ FROM ${gangName}!`, 'good');
                }
            } else {
                this.log(result.message, 'bad');
                if (this.audio) this.audio.playError();
            }

            dialog.remove();
            this.openPanel('hideout'); // Refresh the panel
        });

        dialog.querySelector('#cancel-attack').addEventListener('click', () => {
            dialog.remove();
        });
    }

    renderRipperdoc() {
        // Clear existing content to prevent stacking
        this.panelContent.innerHTML = '';

        const members = this.gm.members;

        const header = document.createElement('div');
        header.className = 'ripperdoc-header';
        header.innerHTML = `<h3>MEDICAL & UPGRADES</h3><p>Heal injured members and install cyberware</p>`;
        this.panelContent.appendChild(header);

        members.forEach((m, index) => {
            const div = document.createElement('div');
            div.className = 'ripperdoc-card';
            div.style.animationDelay = `${index * 0.1}s`;

            const healthPercent = (m.health / m.maxHealth) * 100;
            const coolCost = m.stats.cool * 100;
            const reflexCost = m.stats.reflex * 100;
            const healthCost = 500;

            div.innerHTML = `
                <div class="member-header">
                    <div>
                        <div class="member-name">${m.name} <span class="member-level">LVL ${m.level}</span></div>
                        <div class="member-role">[${m.role}]</div>
                    </div>
                    ${m.injured ? '<div class="member-status status-injured">INJURED</div>' : '<div class="member-status status-idle">HEALTHY</div>'}
                </div>
                <div class="health-bar-container">
                    <div class="health-bar" style="width: ${healthPercent}%"></div>
                    <div class="health-text">${m.health} / ${m.maxHealth} HP</div>
                </div>
                ${m.injured ? `
                    <button class="cyber-btn heal-btn" data-id="${m.id}">HEAL (200€)</button>
                ` : `
                    <div class="upgrade-section">
                        <h4>CYBERWARE UPGRADES</h4>
                        <div class="upgrade-buttons">
                            <button class="cyber-btn small-btn upgrade-btn" data-id="${m.id}" data-type="cool">+2 COOL (${coolCost}€)</button>
                            <button class="cyber-btn small-btn upgrade-btn" data-id="${m.id}" data-type="reflex">+2 REF (${reflexCost}€)</button>
                            <button class="cyber-btn small-btn upgrade-btn" data-id="${m.id}" data-type="health">+20 MAX HP (${healthCost}€)</button>
                        </div>
                    </div>
                `}
            `;

            // Heal button
            const healBtn = div.querySelector('.heal-btn');
            if (healBtn) {
                healBtn.addEventListener('click', () => {
                    if (this.gm.healMember(m.id)) {
                        if (this.audio) this.audio.playHeal();
                        this.log(`${m.name} HEALED.`, 'good');
                        this.renderRipperdoc();
                    } else {
                        if (this.audio) this.audio.playError();
                        this.log('INSUFFICIENT FUNDS.', 'bad');
                    }
                });
            }

            // Upgrade buttons
            div.querySelectorAll('.upgrade-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const upgradeType = btn.dataset.type;
                    if (this.gm.upgradeMember(m.id, upgradeType)) {
                        if (this.audio) this.audio.playUpgrade();
                        this.log(`${m.name} UPGRADED: ${upgradeType.toUpperCase()}`, 'good');
                        this.renderRipperdoc();
                    } else {
                        if (this.audio) this.audio.playError();
                        this.log('INSUFFICIENT FUNDS.', 'bad');
                    }
                });
            });

            this.panelContent.appendChild(div);
        });
    }

    renderRecruitment() {
        const div = document.createElement('div');
        div.className = 'recruitment-panel';
        div.innerHTML = `
            <p class="recruitment-text">LOOKING FOR EDGERUNNERS?</p>
            <div class="recruitment-info">
                <div class="info-item">💰 Cost: 500 Eddies</div>
                <div class="info-item">📊 Random Stats</div>
                <div class="info-item">⭐ Level 1</div>
            </div>
            <button class="cyber-btn recruit-btn" id="recruit-btn">HIRE MERC</button>
        `;
        this.panelContent.appendChild(div);

        div.querySelector('#recruit-btn').addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click-through to HQ zone
            if (this.gm.eddies >= 500) {
                if (this.audio) this.audio.playPurchase();
                this.gm.addEddies(-500);
                const name = 'Merc-' + Math.floor(Math.random() * 1000);
                this.gm.recruitMember(name, 'Solo');
                this.log(`${name} HIRED.`, 'good');

                // Flash effect and refresh
                div.querySelector('#recruit-btn').classList.add('btn-flash');
                setTimeout(() => {
                    this.closePanel();
                    setTimeout(() => this.openPanel('hideout'), 100);
                }, 500);
            } else {
                if (this.audio) this.audio.playError();
                this.log('INSUFFICIENT FUNDS.', 'bad');
            }
        });
    }

    log(msg, type = 'neutral') {
        this.logEl.textContent = `> ${msg}`;
        this.logEl.className = ''; // Reset classes
        this.logEl.classList.add(`log-${type}`);
        this.logEl.classList.add('glitch');
        setTimeout(() => this.logEl.classList.remove('glitch'), 500);
    }
}
