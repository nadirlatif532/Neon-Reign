export class RivalGangManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.gangs = [];
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        // Create initial rival gangs
        this.gangs = [
            this.createGang('MAELSTROM', 'aggressive', 2),
            this.createGang('TYGER CLAWS', 'balanced', 1),
            this.createGang('VALENTINOS', 'defensive', 1)
        ];

        this.initialized = true;

        // Start AI behavior
        this.startAI();
    }

    createGang(name, personality, initialTerritories = 0) {
        const gang = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            personality: personality, // aggressive, balanced, defensive
            territories: [],
            strength: 50,
            aggression: personality === 'aggressive' ? 0.7 : personality === 'balanced' ? 0.5 : 0.3
        };

        // Assign initial territories
        const uncontrolled = this.gm.territories.filter(t => !t.controlled && !t.rivalGang);
        for (let i = 0; i < initialTerritories && i < uncontrolled.length; i++) {
            const territory = uncontrolled[i];
            territory.rivalGang = gang.id;
            gang.territories.push(territory.id);
        }

        this.updateGangStrength(gang);
        return gang;
    }

    updateGangStrength(gang) {
        // Strength = territories * 20 + base strength
        gang.strength = (gang.territories.length * 20) + 50;
    }

    startAI() {
        // Rival gangs attempt actions every 45-90 seconds
        setInterval(() => {
            this.gangs.forEach(gang => {
                if (Math.random() < gang.aggression) {
                    this.gangAction(gang);
                }
            });
        }, 60000); // Every 60 seconds
    }

    gangAction(gang) {
        const action = Math.random();

        if (action < 0.4) {
            // Try to capture unclaimed territory
            this.attemptTerritoryCapture(gang);
        } else if (action < 0.7) {
            // Try to raid player territory (handled by EventManager)
            // Just increase aggression temporarily
            gang.aggression = Math.min(1, gang.aggression + 0.1);
        } else {
            // Consolidate power (reduce aggression, increase strength)
            gang.aggression = Math.max(0.2, gang.aggression - 0.05);
            gang.strength += 5;
        }
    }

    attemptTerritoryCapture(gang) {
        const uncontrolled = this.gm.territories.filter(t => !t.controlled && !t.rivalGang);

        if (uncontrolled.length === 0) return;

        const target = uncontrolled[Math.floor(Math.random() * uncontrolled.length)];
        target.rivalGang = gang.id;
        gang.territories.push(target.id);
        this.updateGangStrength(gang);

        // Notify player
        window.dispatchEvent(new CustomEvent('game-event', {
            detail: {
                message: `${gang.name} CAPTURED ${target.name}!`,
                type: 'bad'
            }
        }));
    }

    attackTerritory(territoryId, playerMembers) {
        const territory = this.gm.territories.find(t => t.id === territoryId);
        if (!territory || !territory.rivalGang) return { success: false, message: 'Invalid target' };

        const gang = this.gangs.find(g => g.id === territory.rivalGang);
        if (!gang) return { success: false, message: 'Gang not found' };

        // Calculate player power
        // Base power per member + stats + level bonus
        const playerPower = playerMembers.reduce((sum, m) => {
            // Cool/Reflex give 2 power each. Level gives 5. Base 10.
            // A level 1 member with 3/3 stats = 10 + 6 + 6 + 5 = 27 power.
            // 3 members = ~81 power.
            return sum + 10 + (m.stats.cool * 2) + (m.stats.reflex * 2) + (m.level * 5);
        }, 0);

        // Calculate gang defense power
        // Gang strength starts at 50.
        // Random variance of +/- 10%.
        const variance = (Math.random() * 0.2) + 0.9; // 0.9 to 1.1
        const gangPower = Math.floor(gang.strength * variance);

        console.log(`Battle: Player Power ${playerPower} vs Gang Power ${gangPower}`);

        // Battle outcome
        const success = playerPower > gangPower;

        if (success) {
            // Player wins
            territory.rivalGang = null;
            territory.controlled = true;
            gang.territories = gang.territories.filter(id => id !== territoryId);
            this.updateGangStrength(gang);

            // Check if gang is eliminated
            if (gang.territories.length === 0) {
                this.eliminateGang(gang.id);
                return {
                    success: true,
                    message: `${territory.name} CAPTURED! ${gang.name} ELIMINATED!`,
                    eliminated: true,
                    loot: Math.floor(gangPower * 3) // Bonus loot for elimination
                };
            }

            return {
                success: true,
                message: `${territory.name} CAPTURED FROM ${gang.name}!`,
                loot: Math.floor(gangPower * 2)
            };
        } else {
            // Player loses - members take damage
            let casualties = 0;
            playerMembers.forEach(m => {
                const damage = Math.floor(Math.random() * 30) + 10; // 10-40 damage
                m.health = Math.max(0, m.health - damage);
                if (m.health <= 0) {
                    m.injured = true;
                    casualties++;
                }
            });

            return {
                success: false,
                message: `ATTACK ON ${territory.name} FAILED! ${casualties} MEMBER(S) INJURED.`,
                casualties: casualties
            };
        }
    }

    eliminateGang(gangId) {
        this.gangs = this.gangs.filter(g => g.id !== gangId);

        // Possibly spawn a new gang if there's room
        if (this.gangs.length < 3) {
            setTimeout(() => {
                const names = ['6TH STREET', 'ANIMALS', 'VOODOO BOYS', 'SCAVENGERS'];
                const availableNames = names.filter(n => !this.gangs.find(g => g.name === n));
                if (availableNames.length > 0) {
                    const newGang = this.createGang(
                        availableNames[Math.floor(Math.random() * availableNames.length)],
                        'balanced',
                        0
                    );
                    this.gangs.push(newGang);

                    window.dispatchEvent(new CustomEvent('game-event', {
                        detail: {
                            message: `${newGang.name} EMERGED IN NIGHT CITY!`,
                            type: 'neutral'
                        }
                    }));
                }
            }, 30000); // New gang emerges after 30 seconds
        }
    }

    getGangInfo() {
        return this.gangs.map(g => ({
            name: g.name,
            territories: g.territories.length,
            strength: g.strength,
            personality: g.personality
        }));
    }

    getGangByTerritory(territoryId) {
        return this.gangs.find(g => g.territories.includes(territoryId));
    }
}
