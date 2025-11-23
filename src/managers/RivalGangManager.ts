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
            this.createGang('MAELSTROM', 'aggressive', 2),
            this.createGang('TYGER CLAWS', 'balanced', 1),
            this.createGang('VALENTINOS', 'defensive', 1)
        ];

        this.initialized = true;
        this.startAI();
    }

    private createGang(name: string, personality: 'aggressive' | 'balanced' | 'defensive', initialTerritories: number = 0): RivalGang {
        const gang: RivalGang = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            personality,
            territories: [],
            strength: 50,
            aggression: personality === 'aggressive' ? 0.7 : personality === 'balanced' ? 0.5 : 0.3
        };

        // Assign initial territories
        const state = this.gameStore.get();
        const uncontrolled = state.territories.filter((t: any) => !t.controlled && !t.rivalGang);

        for (let i = 0; i < initialTerritories && i < uncontrolled.length; i++) {
            const territory = uncontrolled[i];
            territory.rivalGang = gang.id;
            gang.territories.push(territory.id);
        }

        this.updateGangStrength(gang);
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
        const state = this.gameStore.get();
        const uncontrolled = state.territories.filter((t: any) => !t.controlled && !t.rivalGang);

        if (uncontrolled.length === 0) return;

        const target = uncontrolled[Math.floor(Math.random() * uncontrolled.length)];
        target.rivalGang = gang.id;
        gang.territories.push(target.id);
        this.updateGangStrength(gang);

        window.dispatchEvent(new CustomEvent('game-event', {
            detail: {
                message: `${gang.name} CAPTURED ${target.name}!`,
                type: 'bad'
            }
        }));
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
            target.income = Math.floor(target.income * 1.2);
            this.updateGangStrength(attacker);
            attacker.strength += 20;

            window.dispatchEvent(new CustomEvent('game-event', {
                detail: {
                    message: `⚠ ${attacker.name} RETOOK ${target.name}! IT IS NOW HEAVILY FORTIFIED!`,
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
            gang.territories = gang.territories.filter(id => id !== territoryId);
            this.updateGangStrength(gang);

            if (gang.territories.length === 0) {
                this.eliminateGang(gang.id);
                return {
                    success: true,
                    message: `${territory.name} CAPTURED! ${gang.name} ELIMINATED!`,
                    eliminated: true,
                    loot: Math.floor(gangPower * 3)
                };
            }

            return {
                success: true,
                message: `${territory.name} CAPTURED FROM ${gang.name}!`,
                loot: Math.floor(gangPower * 2)
            };
        } else {
            let casualties = 0;
            playerMembers.forEach(m => {
                const damage = Math.floor(Math.random() * 30) + 10;
                m.health = Math.max(0, m.health - damage);
                if (m.health <= 0) {
                    m.injured = true;
                    casualties++;
                }
            });

            return {
                success: false,
                message: `ATTACK ON ${territory.name} FAILED! ${casualties} MEMBER(S) INJURED.`,
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
