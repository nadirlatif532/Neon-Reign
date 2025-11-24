// RivalGangManager.ts - Manages rival gang AI and territory warfare

export interface RivalGang {
    id: string;
    name: string;
    personality: 'aggressive' | 'balanced' | 'defensive';
    territories: number[];
    strength: number;
    aggression: number;
}

export class RivalGangManager {
    private gangs: RivalGang[] = [];
    private initialized = false;
    private gameStore: any;
    private aiInterval: number | null = null;

    constructor(gameStore: any) {
        this.gameStore = gameStore;
    }

    initialize() {
        if (this.initialized) return;

        // Create initial rival gangs
        this.gangs = [
            this.createGang('MAELSTROM', 'aggressive'),
            this.createGang('TYGER CLAWS', 'balanced'),
            this.createGang('VALENTINOS', 'defensive')
        ];

        this.initialized = true;

        // Clear any old rival gang data from territories (fix for ghost gangs from save data)
        const state = this.gameStore.get();
        state.territories.forEach((t: any) => {
            if (t.rivalGang) {
                t.rivalGang = null;
            }
        });

        // Assign territories to gangs (but skip player-controlled ones)
        const uncontrolledTerritories = state.territories.filter((t: any) => !t.controlled);
        uncontrolledTerritories.forEach((territory: any, index: number) => {
            const gangIndex = index % this.gangs.length;
            const gang = this.gangs[gangIndex];

            territory.rivalGang = gang.id;
            gang.territories.push(territory.id);
            console.log(`Assigned ${territory.name} to ${gang.name}`);
        });

        // Update strengths after assignment
        this.gangs.forEach(g => this.updateGangStrength(g));

        // Persist the changes to the store
        this.gameStore.setKey('territories', [...this.gameStore.get().territories]);

        this.startAI();
    }

    private createGang(name: string, personality: 'aggressive' | 'balanced' | 'defensive'): RivalGang {
        console.log(`Creating gang ${name}`);
        const gang: RivalGang = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            personality,
            territories: [],
            strength: 50,
            aggression: personality === 'aggressive' ? 0.7 : personality === 'balanced' ? 0.5 : 0.3
        };

        return gang;
    }

    private updateGangStrength(gang: RivalGang) {
        gang.strength = (gang.territories.length * 20) + 50;
    }

    private startAI() {
        this.aiInterval = window.setInterval(() => {
            this.gangs.forEach(gang => {
                if (Math.random() < gang.aggression) {
                    this.gangAction(gang);
                }
            });
        }, 60000); // Every 60 seconds
    }

    private gangAction(gang: RivalGang) {
        const action = Math.random();

        if (action < 0.4) {
            this.attemptTerritoryCapture(gang);
        } else if (action < 0.7) {
            gang.aggression = Math.min(1, gang.aggression + 0.1);
        } else {
            gang.aggression = Math.max(0.2, gang.aggression - 0.05);
            gang.strength += 5;
        }
    }

    private attemptTerritoryCapture(gang: RivalGang) {
        // Gangs now only attack player or other gangs, as there are no unclaimed

        // Logic for gang-vs-gang or gang-vs-player could go here
        // For now, let's keep it simple: they fortify
        gang.strength += 10;
    }

    attemptRetaliation() {
        const state = this.gameStore.get();
        const playerTerritories = state.territories.filter((t: any) => t.controlled);

        if (playerTerritories.length === 0) return;

        const target = playerTerritories[Math.floor(Math.random() * playerTerritories.length)];
        const attacker = this.gangs[Math.floor(Math.random() * this.gangs.length)];

        if (!attacker) return;

        const chance = 0.3 + (attacker.aggression * 0.2);

        if (Math.random() < chance) {
            target.controlled = false;
            target.rivalGang = attacker.id;
            attacker.territories.push(target.id);
            // Gangs also boost income when they retake it
            target.income = Math.floor(target.income * 1.1);
            this.updateGangStrength(attacker);
            attacker.strength += 20;

            // Trigger store update
            this.gameStore.setKey('territories', [...state.territories]);

            window.dispatchEvent(new CustomEvent('game-event', {
                detail: {
                    message: `⚠ ${attacker.name} RETOOK ${target.name}!`,
                    type: 'bad'
                }
            }));
        }
    }

    attackTerritory(territoryId: number, playerMembers: any[]) {
        const state = this.gameStore.get();
        const territory = state.territories.find((t: any) => t.id === territoryId);

        if (!territory || !territory.rivalGang) {
            return { success: false, message: 'Invalid target' };
        }

        const gang = this.gangs.find(g => g.id === territory.rivalGang);
        if (!gang) return { success: false, message: 'Gang not found' };

        const playerPower = playerMembers.reduce((sum, m) => {
            return sum + 10 + (m.stats.cool * 2) + (m.stats.reflex * 2) + (m.level * 5);
        }, 0);

        const variance = (Math.random() * 0.2) + 0.9;
        const gangPower = Math.floor(gang.strength * variance);

        const success = playerPower > gangPower;

        if (success) {
            territory.rivalGang = null;
            territory.controlled = true;

            // SIGNIFICANT INCOME BOOST
            // Base boost + multiplier based on difficulty
            const oldIncome = territory.income;
            territory.income = Math.floor(territory.income * 3) + 50;

            gang.territories = gang.territories.filter(id => id !== territoryId);
            this.updateGangStrength(gang);

            if (gang.territories.length === 0) {
                this.eliminateGang(gang.id);
                return {
                    success: true,
                    message: `${territory.name} CAPTURED! INCOME INCREASED (${oldIncome} -> ${territory.income})! ${gang.name} ELIMINATED!`,
                    eliminated: true,
                    loot: Math.floor(gangPower * 3)
                };
            }

            return {
                success: true,
                message: `${territory.name} CAPTURED! INCOME INCREASED (${oldIncome} -> ${territory.income})!`,
                loot: Math.floor(gangPower * 2)
            };
        } else {
            let casualties = 0;
            // STRICT FAILURE: ALL MEMBERS INJURED
            playerMembers.forEach(m => {
                m.health = 0; // Critical condition
                m.injured = true;
                casualties++;
            });

            return {
                success: false,
                message: `ATTACK FAILED! TOTAL DEFEAT. ALL MEMBERS CRITICALLY INJURED.`,
                casualties
            };
        }
    }

    private eliminateGang(gangId: string) {
        this.gangs = this.gangs.filter(g => g.id !== gangId);

        if (this.gangs.length < 3) {
            setTimeout(() => {
                const names = ['6TH STREET', 'ANIMALS', 'VOODOO BOYS', 'SCAVENGERS'];
                const availableNames = names.filter(n => !this.gangs.find(g => g.name === n));

                if (availableNames.length > 0) {
                    const newGang = this.createGang(
                        availableNames[Math.floor(Math.random() * availableNames.length)],
                        'balanced'
                    );
                    this.gangs.push(newGang);

                    window.dispatchEvent(new CustomEvent('game-event', {
                        detail: {
                            message: `${newGang.name} EMERGED IN NIGHT CITY!`,
                            type: 'neutral'
                        }
                    }));
                }
            }, 30000);
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

    getGangByTerritory(territoryId: number) {
        return this.gangs.find(g => g.territories.includes(territoryId));
    }

    destroy() {
        if (this.aiInterval) {
            clearInterval(this.aiInterval);
        }
    }
}
