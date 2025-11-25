// RivalGangManager.ts - Manages rival gang AI and territory warfare

export interface RivalGang {
    id: string;
    name: string;
    personality: 'aggressive' | 'balanced' | 'defensive';
    territories: number[];
    strength: number;
    aggression: number;
    // New Diplomacy & Resource fields
    relationship: number; // -100 (War) to 100 (Ally) with Player
    allies: string[]; // IDs of allied gangs
    enemies: string[]; // IDs of enemy gangs
    resources: number; // For funding operations
    color: string; // Hex color for map
    pacts: { type: 'NON_AGGRESSION' | 'ALLIANCE', expiresAt: number }[];
}

export class RivalGangManager {
    private gangs: RivalGang[] = [];
    private initialized = false;
    private gameStore: any;

    constructor() {
    }

    initialize(gameStore: any) {
        if (this.initialized) return;
        this.gameStore = gameStore;

        // Create initial rival gangs
        this.gangs = [
            this.createGang('MAELSTROM', 'aggressive', '#FF0000'),
            this.createGang('TYGER CLAWS', 'balanced', '#00FF00'),
            this.createGang('VALENTINOS', 'defensive', '#FFD700')
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

    private createGang(name: string, personality: 'aggressive' | 'balanced' | 'defensive', color: string = '#FFFFFF'): RivalGang {
        console.log(`Creating gang ${name}`);
        const gang: RivalGang = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            personality,
            territories: [],
            strength: 50,
            aggression: personality === 'aggressive' ? 0.7 : personality === 'balanced' ? 0.5 : 0.3,
            relationship: -10, // Starts slightly hostile
            allies: [],
            enemies: [],
            resources: 500,
            color,
            pacts: []
        };

        return gang;
    }

    private updateGangStrength(gang: RivalGang) {
        gang.strength = (gang.territories.length * 20) + 50;
    }

    private startAI() {
        window.setInterval(() => {
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

    /**
     * @deprecated Use WarfareManager.startOperation instead
     */
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
            territory.income = Math.floor(territory.income * 3) + 50;

            gang.territories = gang.territories.filter(id => id !== territoryId);
            this.updateGangStrength(gang);

            if (gang.territories.length === 0) {
                this.eliminateGang(gang.id);
                return {
                    success: true,
                    message: `${territory.name} CAPTURED BY ${state.gangName.toUpperCase()}! ${gang.name} ELIMINATED!`,
                    eliminated: true,
                    loot: Math.floor(gangPower * 3)
                };
            }

            return {
                success: true,
                message: `${territory.name} CAPTURED BY ${state.gangName.toUpperCase()}! INCOME INCREASED!`,
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

    getAiMove(gang: RivalGang, state: any): { type: 'SCOUT' | 'RAID' | 'ASSAULT' | 'FORTIFY', targetId: number } | null {
        // Simple AI Logic
        if (gang.resources < 50) return null; // Too poor

        // 1. Check own territories for defense
        const myTerritories = state.territories.filter((t: any) => gang.territories.includes(t.id));
        const weakTerritory = myTerritories.find((t: any) => t.defense < 30);

        if (weakTerritory && gang.resources >= 200) {
            return { type: 'FORTIFY', targetId: weakTerritory.id };
        }

        // 2. Look for expansion targets
        // Find adjacent territories (conceptually) or just any non-owned
        // For simplicity, pick a random non-owned territory
        const potentialTargets = state.territories.filter((t: any) => !gang.territories.includes(t.id));
        if (potentialTargets.length === 0) return null;

        const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];

        // Decide action based on aggression and target state
        const roll = Math.random();

        if (gang.personality === 'aggressive') {
            if (roll < 0.6 && gang.resources >= 1000) return { type: 'ASSAULT', targetId: target.id };
            if (roll < 0.9 && gang.resources >= 500) return { type: 'RAID', targetId: target.id };
        } else if (gang.personality === 'balanced') {
            if (roll < 0.3 && gang.resources >= 1000) return { type: 'ASSAULT', targetId: target.id };
            if (roll < 0.7 && gang.resources >= 500) return { type: 'RAID', targetId: target.id };
        } else {
            // Defensive
            if (roll < 0.1 && gang.resources >= 1000) return { type: 'ASSAULT', targetId: target.id };
        }

        if (gang.resources >= 50 && Math.random() < 0.3) return { type: 'SCOUT', targetId: target.id };

        return null;
    }

    getGangInfo() {
        return this.gangs.map(g => ({
            id: g.id,
            name: g.name,
            territories: g.territories.length,
            strength: g.strength,
            personality: g.personality,
            color: g.color,
            relationship: g.relationship
        }));
    }

    getGangByTerritory(territoryId: number) {
        return this.gangs.find(g => g.territories.includes(territoryId));
    }

    getGangById(id: string) {
        return this.gangs.find(g => g.id === id);
    }

    changeRelationship(gangId: string, amount: number) {
        const gang = this.gangs.find(g => g.id === gangId);
        if (gang) {
            gang.relationship = Math.max(-100, Math.min(100, gang.relationship + amount));
            console.log(`Relationship with ${gang.name} changed to ${gang.relationship}`);
        }
    }

    setAlliance(gangId: string, isAlly: boolean) {
        const gang = this.gangs.find(g => g.id === gangId);
        if (gang) {
            if (isAlly) {
                gang.relationship = 100;
                if (!gang.allies.includes('PLAYER')) gang.allies.push('PLAYER');
            } else {
                gang.allies = gang.allies.filter(id => id !== 'PLAYER');
            }
        }
    }

    // --- Diplomacy Methods ---

    signPact(gangId: string, type: 'NON_AGGRESSION' | 'ALLIANCE', _durationDays: number = 3): boolean {
        const gang = this.getGangById(gangId);
        if (!gang) return false;

        // Make it 5 minutes for gameplay pacing
        const durationMs = 5 * 60 * 1000;
        const expiresAt = Date.now() + durationMs;

        gang.pacts.push({ type, expiresAt });
        this.changeRelationship(gangId, 20);

        window.dispatchEvent(new CustomEvent('game-event', {
            detail: { message: `Pact signed with ${gang.name}`, type: 'success' }
        }));
        return true;
    }

    demandTribute(gangId: string): { success: boolean, amount: number, message: string } {
        const gang = this.getGangById(gangId);
        if (!gang) return { success: false, amount: 0, message: 'Gang not found' };

        // Logic: Success depends on Player Power vs Gang Strength
        // For now, simple RNG based on relationship (hated gangs refuse)

        if (gang.relationship < -50) {
            this.changeRelationship(gangId, -20);
            return { success: false, amount: 0, message: `${gang.name} refused and insulted you!` };
        }

        const amount = 500;
        if (gang.resources >= amount) {
            gang.resources -= amount;
            this.changeRelationship(gangId, -10); // They don't like paying
            return { success: true, amount, message: `${gang.name} paid ${amount}€ tribute.` };
        } else {
            return { success: false, amount: 0, message: `${gang.name} is too broke to pay.` };
        }
    }

    improveRelations(gangId: string): boolean {
        const gang = this.getGangById(gangId);
        if (!gang) return false;

        this.changeRelationship(gangId, 15);
        return true;
    }

    hasPact(gangId: string, type: 'NON_AGGRESSION' | 'ALLIANCE'): boolean {
        const gang = this.getGangById(gangId);
        if (!gang) return false;
        return gang.pacts.some(p => p.type === type && p.expiresAt > Date.now());
    }

    tradeIntel(gangId: string): { success: boolean, message: string, data?: any } {
        const gang = this.getGangById(gangId);
        if (!gang) return { success: false, message: 'Gang not found' };

        if (gang.relationship < 0) {
            return { success: false, message: `${gang.name} refuses to share intel with enemies.` };
        }

        // Reveal a random territory of theirs or a rival
        const state = this.gameStore.get();
        const unknownTerritories = state.territories.filter((t: any) =>
            (t.rivalGang === gangId || gang.enemies.includes(t.rivalGang)) && (t.intel || 0) < 100
        );

        if (unknownTerritories.length === 0) {
            return { success: false, message: 'No new intel available from this gang.' };
        }

        const target = unknownTerritories[Math.floor(Math.random() * unknownTerritories.length)];
        target.intel = 100; // Full reveal
        this.gameStore.setKey('territories', [...state.territories]);

        return { success: true, message: `Intel received on ${target.name}!`, data: target };
    }

    proxyWar(gangId: string, targetGangId: string): { success: boolean, message: string } {
        const gang = this.getGangById(gangId);
        const targetGang = this.getGangById(targetGangId);

        if (!gang || !targetGang) return { success: false, message: 'Invalid gangs' };

        if (gang.relationship < 50) {
            return { success: false, message: `${gang.name} doesn't trust you enough for this.` };
        }

        // Trigger an attack
        const state = this.gameStore.get();
        const targetTerritory = state.territories.find((t: any) => t.rivalGang === targetGangId);
        if (targetTerritory) {
            // Simulate attack start
            window.dispatchEvent(new CustomEvent('game-event', {
                detail: { message: `${gang.name} is preparing to attack ${targetGang.name}!`, type: 'neutral' }
            }));
            return { success: true, message: `${gang.name} agreed to attack ${targetGang.name}.` };
        }

        return { success: false, message: 'No valid targets found.' };
    }
}

export const rivalGangManager = new RivalGangManager();
