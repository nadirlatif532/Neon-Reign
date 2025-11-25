import { gameStore, addEddies, addRep } from '@/state/GameStore';
import { rivalGangManager } from '@/managers/RivalGangManager';

export type OperationType = 'SCOUT' | 'RAID' | 'ASSAULT' | 'FORTIFY' | 'DEFEND' | 'SABOTAGE';

export interface Operation {
    id: string;
    type: OperationType;
    targetTerritoryId: number;
    initiatorGangId: string; // 'PLAYER' or Gang ID
    startTime: number;
    endTime: number;
    power: number; // Combat power committed
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    memberIds?: number[];
}

export interface GlobalEvent {
    id: string;
    name: string;
    description: string;
    effect: 'HEAT_WAVE' | 'MARKET_BOOM' | 'GANG_WAR';
    expiresAt: number;
}

export class WarfareManager {
    private operations: Operation[] = [];
    private currentEvent: GlobalEvent | null = null;
    private tickInterval: number | null = null;
    private readonly TICK_RATE = 10000; // 10 seconds per tick

    constructor() {
        this.startLoop();
    }

    private startLoop() {
        if (this.tickInterval) return;
        console.log('[WarfareManager] Starting Strategic Loop');
        this.tickInterval = window.setInterval(() => {
            this.processTick();
        }, this.TICK_RATE);

        // Income Loop (Every 60s)
        window.setInterval(() => {
            this.processIncome();
        }, 60000);

        // Event Loop (Every 5 mins)
        window.setInterval(() => {
            if (!this.currentEvent && Math.random() < 0.5) {
                this.triggerRandomEvent();
            }
        }, 300000);

        // Listen for AI triggers
        window.addEventListener('trigger-warfare-op', (e: any) => {
            const { type, targetId, initiatorId, power, duration } = e.detail;
            this.startOperation(type, targetId, initiatorId, power, duration);
        });
    }

    getCurrentEvent() {
        return this.currentEvent;
    }

    private triggerRandomEvent() {
        const events: GlobalEvent[] = [
            { id: 'ev_1', name: 'POLICE CRACKDOWN', description: 'Heat rises faster!', effect: 'HEAT_WAVE', expiresAt: Date.now() + 120000 },
            { id: 'ev_2', name: 'BLACK MARKET BOOM', description: 'Income +20%', effect: 'MARKET_BOOM', expiresAt: Date.now() + 120000 },
            { id: 'ev_3', name: 'GANG WARFARE', description: 'Rivals are distracted', effect: 'GANG_WAR', expiresAt: Date.now() + 120000 }
        ];

        this.currentEvent = events[Math.floor(Math.random() * events.length)];

        this.notify(`EVENT STARTED: ${this.currentEvent.name}`, 'neutral');

        // Auto-clear
        setTimeout(() => {
            if (this.currentEvent) {
                this.notify(`EVENT ENDED: ${this.currentEvent.name}`, 'neutral');
                this.currentEvent = null;
            }
        }, 120000);
    }

    private processTick() {
        const now = Date.now();
        const state = gameStore.get();

        // 1. Process Active Operations
        this.operations.forEach(op => {
            if (op.status === 'IN_PROGRESS' && now >= op.endTime) {
                this.resolveOperation(op);
            }
        });

        // Cleanup completed operations
        this.operations = this.operations.filter(op => op.status === 'IN_PROGRESS');

        // 2. AI Turn (Rivals make moves)
        const gangs = rivalGangManager.getGangInfo();
        gangs.forEach(g => {
            const gang = rivalGangManager.getGangById(g.id);
            if (gang) {
                // Check if gang is already busy
                const isBusy = this.operations.some(op => op.initiatorGangId === gang.id && op.status === 'IN_PROGRESS');
                if (isBusy) return;

                const move = rivalGangManager.getAiMove(gang, state);
                if (move) {
                    let cost = 0;
                    let duration = 10000;
                    let power = gang.strength;

                    switch (move.type) {
                        case 'SCOUT': cost = 50; duration = 5000; break;
                        case 'RAID': cost = 500; power = Math.floor(gang.strength * 0.5); duration = 15000; break;
                        case 'ASSAULT': cost = 1000; power = gang.strength; duration = 30000; break;
                        case 'FORTIFY': cost = 200; duration = 10000; break;
                    }

                    if (gang.resources >= cost) {
                        gang.resources -= cost;
                        this.startOperation(move.type, move.targetId, gang.id, power, duration);
                    }
                }
            }
        });

        // 3. Update Territory Stability/Defense/Heat (Passive recovery/decay)
        const updatedTerritories = state.territories.map(t => {
            // Slow recovery if not under attack
            const isUnderAttack = this.operations.some(op => op.targetTerritoryId === t.id && op.type !== 'DEFEND' && op.type !== 'FORTIFY');

            if (!isUnderAttack) {
                if (t.defense < 100 && Math.random() < 0.1) { t.defense = Math.min(100, t.defense + 1); }
                if (t.stability < 100 && Math.random() < 0.1) { t.stability = Math.min(100, t.stability + 1); }

                // Heat Decay
                if (t.heat > 0 && Math.random() < 0.2) {
                    t.heat = Math.max(0, t.heat - 1);
                }
            }

            // Police Raid Logic (High Heat)
            if (t.heat >= 80 && t.controlled && Math.random() < 0.05) {
                this.triggerPoliceRaid(t);
            }

            return t;
        });

        gameStore.setKey('territories', updatedTerritories);
    }

    private triggerPoliceRaid(territory: any) {
        // Police Raid Event
        const damage = 20;
        territory.defense = Math.max(0, territory.defense - damage);
        territory.stability = Math.max(0, territory.stability - damage);
        territory.heat = Math.max(0, territory.heat - 30); // Heat drops after raid

        // Cost penalty (Bribes/Fines)
        addEddies(-500);

        this.notify(`POLICE RAID on ${territory.name}! Defense damaged, 500€ lost in bribes.`, 'bad');
    }

    private processIncome() {
        const state = gameStore.get();
        const controlledTerritories = state.territories.filter(t => t.controlled);

        if (controlledTerritories.length === 0) return;

        let totalIncome = 0;
        controlledTerritories.forEach(t => {
            // Stability affects income (100% stability = 100% income, 0% stability = 50% income)
            const stabilityMod = 0.5 + (t.stability / 200);
            let income = Math.floor(t.income * stabilityMod);

            // MARKET Upgrade: +20% Income
            if (t.upgrades.includes('MARKET')) {
                income = Math.floor(income * 1.2);
            }

            totalIncome += income;
        });

        if (totalIncome > 0) {
            addEddies(totalIncome);
            this.notify(`Territory Income: +${totalIncome}€`, 'success');
        }
    }

    public startOperation(type: OperationType, targetTerritoryId: number, initiatorGangId: string, power: number, duration: number, memberIds: number[] = []) {
        const op: Operation = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            targetTerritoryId,
            initiatorGangId,
            startTime: Date.now(),
            endTime: Date.now() + duration,
            power,
            status: 'IN_PROGRESS',
            memberIds // Store involved members
        };

        this.operations.push(op);
        console.log(`[WarfareManager] Started ${type} on Territory ${targetTerritoryId} by ${initiatorGangId}`);

        // Notify UI
        window.dispatchEvent(new CustomEvent('warfare-update', { detail: { operation: op } }));

        return op;
    }

    private resolveOperation(op: Operation) {
        op.status = 'COMPLETED';
        const state = gameStore.get();
        const territory = state.territories.find(t => t.id === op.targetTerritoryId);

        // Unlock members if any
        if (op.memberIds && op.memberIds.length > 0) {
            const updatedMembers = state.members.map(m => {
                if (op.memberIds!.includes(m.id)) {
                    return { ...m, status: 'IDLE', currentMission: null };
                }
                return m;
            });
            gameStore.setKey('members', updatedMembers as any);
        }

        if (!territory) return;

        console.log(`[WarfareManager] Resolving ${op.type} on ${territory.name}`);

        switch (op.type) {
            case 'SCOUT':
                // Increase Intel
                territory.intel = Math.min(100, (territory.intel || 0) + 25);

                // NETROOM Upgrade: +10% Intel (More details)
                const netroom = state.upgrades.find(u => u.id === 'NETROOM');
                const netroomLevel = netroom ? netroom.level : 0;
                if (netroomLevel > 0) territory.intel = Math.min(100, territory.intel + (netroomLevel * 10));

                // NETWORK Territory Upgrade: +10% Intel from adjacent territories with NETWORK hubs
                const adjacentNetworks = state.territories.filter(t =>
                    t.controlled && t.upgrades.includes('NETWORK')
                ).length;
                if (adjacentNetworks > 0) {
                    territory.intel = Math.min(100, territory.intel + (adjacentNetworks * 10));
                }

                let report = `Scouting Complete. Intel: ${territory.intel}%`;

                if (territory.intel >= 25) report += ` | Def: ${territory.defense}, Stab: ${territory.stability}`;
                if (territory.intel >= 50) report += ` | Income: ${territory.income}, Slots: ${territory.slots}`;
                if (territory.intel >= 75) {
                    const rival = territory.rivalGang ? rivalGangManager.getGangById(territory.rivalGang) : null;
                    if (rival) report += ` | Garrison: ${rival.strength}`;
                }
                if (territory.intel >= 100) report += ` | CRITICAL WEAKNESS FOUND (+10% Combat Bonus)`;

                this.notify(report, 'neutral');
                break;

            case 'SABOTAGE':
                // Lowers defense without much heat
                territory.defense = Math.max(0, territory.defense - 15);
                territory.heat = Math.min(100, territory.heat + 5);
                this.notify(`Sabotage successful! ${territory.name} defenses weakened.`, 'success');
                break;

            case 'RAID':
                // Lower stability/defense, steal eddies
                const damage = Math.floor(op.power / 10);
                territory.defense = Math.max(0, territory.defense - damage);
                territory.stability = Math.max(0, territory.stability - damage);

                // Increase Heat
                territory.heat = Math.min(100, territory.heat + 15);

                if (op.initiatorGangId === 'PLAYER') {
                    // Rebalanced: Loot is 3x income (approx 150-450) vs 100 cost
                    const loot = Math.floor(territory.income * 3);
                    addEddies(loot);
                    this.notify(`Raid successful! Weakened ${territory.name} and stole ${loot}€ (Heat +15)`, 'success');
                } else {
                    this.notify(`${territory.name} was RAIDED by rivals! Defense weakened.`, 'bad');
                }
                break;

            case 'ASSAULT':
                // Capture attempt
                let defensePower = territory.defense * 10 + (territory.controlled ? 500 : 0); // Base defense

                // Check for active DEFEND operation by player
                // Check for active DEFEND operation by player
                const defenseOp = this.operations.find(o => o.targetTerritoryId === territory.id && o.type === 'DEFEND' && o.status === 'IN_PROGRESS');
                if (defenseOp) {
                    defensePower += defenseOp.power; // Add defender power
                    this.notify(`Defenders repelling assault on ${territory.name}!`, 'neutral');
                }

                // Ally Support: Check if any allied gangs will help defend
                if (op.initiatorGangId !== 'PLAYER' && territory.controlled) {
                    const allies = rivalGangManager.getGangInfo().filter(g => g.relationship >= 80); // Allies have 80+ relationship
                    if (allies.length > 0) {
                        // Allies reduce enemy attack power by 20%
                        const allySupport = op.power * 0.2;
                        defensePower += allySupport;
                        this.notify(`Allied gangs are helping defend ${territory.name}! (+${Math.floor(allySupport)} defense)`, 'success');
                    }
                }

                // Intel Bonus
                if ((territory.intel || 0) >= 100) {
                    defensePower *= 0.9; // 10% easier
                }

                // Massive Heat Increase
                territory.heat = Math.min(100, territory.heat + 40);

                // Success Logic: Power vs Defense
                // Add some RNG variance (+/- 10%)
                const roll = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
                const effectivePower = op.power * roll;

                if (effectivePower > defensePower) {
                    // Success
                    if (op.initiatorGangId === 'PLAYER') {
                        territory.controlled = true;
                        territory.rivalGang = null;
                        territory.defense = 20; // Damaged after capture
                        territory.stability = 20;
                        territory.intel = 100; // Full knowledge of own turf
                        addRep(50);
                        this.notify(`VICTORY! ${territory.name} captured! (Heat +40)`, 'success');
                    } else {
                        // AI Captured
                        territory.controlled = false;
                        territory.rivalGang = op.initiatorGangId;
                        territory.defense = 30;
                        this.notify(`WARNING: ${territory.name} CAPTURED BY ${op.initiatorGangId}!`, 'bad');
                    }
                } else {
                    // Fail
                    if (op.initiatorGangId === 'PLAYER') {
                        this.notify(`Assault on ${territory.name} FAILED. Defenses too strong. (Heat +40)`, 'bad');
                        // Apply injuries if members were involved
                        if (op.memberIds && op.memberIds.length > 0) {
                            // Simple injury logic: 30% chance per member
                            const injuredMembers: number[] = [];
                            const updatedMembers = state.members.map(m => {
                                if (op.memberIds!.includes(m.id) && Math.random() < 0.3) {
                                    injuredMembers.push(m.id);
                                    return { ...m, health: 0, injured: true, status: 'INJURED' };
                                }
                                return m;
                            });
                            if (injuredMembers.length > 0) {
                                gameStore.setKey('members', updatedMembers as any);
                                this.notify(`${injuredMembers.length} members were injured in the failed assault!`, 'bad');
                            }
                        }
                    } else {
                        this.notify(`Enemy assault on ${territory.name} REPELLED!`, 'success');
                    }
                }
                break;

            case 'FORTIFY':
                territory.defense = Math.min(100, territory.defense + 20);
                if (op.initiatorGangId === 'PLAYER') {
                    this.notify(`${territory.name} defenses reinforced.`, 'success');
                }
                break;

            case 'DEFEND':
                // Defensive operations just add power during assaults (handled above)
                // But if it completes without an attack, maybe a small stability boost?
                territory.stability = Math.min(100, territory.stability + 10);
                this.notify(`${territory.name} secured. Stability increased.`, 'success');
                break;
        }

        gameStore.setKey('territories', [...state.territories]);
    }

    private notify(message: string, type: 'success' | 'bad' | 'neutral') {
        window.dispatchEvent(new CustomEvent('game-event', {
            detail: { message, type }
        }));
    }

    public initiatePlayerAssault(territoryId: number, memberIds: number[]) {
        const state = gameStore.get();
        const territory = state.territories.find(t => t.id === territoryId);
        if (!territory) return { success: false, message: 'Territory not found' };

        const members = state.members.filter(m => memberIds.includes(m.id));

        // Validate members
        const unavailable = members.filter(m => m.status !== 'IDLE' || m.injured);
        if (unavailable.length > 0) return { success: false, message: 'Some members are unavailable' };

        // Calculate Power
        // Formula: (Sum of Stats * 2) + (Sum of Levels * 3)
        // ARMORY Upgrade: +5% Power per level
        let power = members.reduce((sum, m) => {
            return sum + ((m.stats.cool + m.stats.reflex) * 2) + (m.level * 3);
        }, 0);

        const armory = state.upgrades.find(u => u.id === 'ARMORY');
        if (armory) {
            power *= (1 + (armory.level * 0.05));
        }

        // Lock members
        const updatedMembers = state.members.map(m =>
            memberIds.includes(m.id) ? { ...m, status: 'ON MISSION', currentMission: `ASSAULT: ${territory.name}` } : m
        );
        gameStore.setKey('members', updatedMembers as any);

        // Start Operation
        this.startOperation('ASSAULT', territoryId, 'PLAYER', power, 30000, memberIds); // 30s duration

        return { success: true, message: 'Assault initiated!' };
    }

    public getActiveOperations(territoryId?: number) {
        if (territoryId) {
            return this.operations.filter(op => op.targetTerritoryId === territoryId);
        }
        return this.operations;
    }
}

export const warfareManager = new WarfareManager();
