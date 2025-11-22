import { EventManager } from './EventManager.js';
import { RivalGangManager } from './RivalGangManager.js';
import { AsciiGenerator } from '../utils/AsciiGenerator.js';

export class GameManager {
    constructor() {
        this.eddies = 1000;
        this.rep = 10;
        this.members = [];
        this.listeners = [];
        this.territories = [
            { id: 1, name: 'WATSON', controlled: true, income: 50 },
            { id: 2, name: 'WESTBROOK', controlled: false, income: 75 },
            { id: 3, name: 'CITY CENTER', controlled: false, income: 100 },
            { id: 4, name: 'SANTO DOMINGO', controlled: false, income: 60 },
            { id: 5, name: 'PACIFICA', controlled: false, income: 80 }
        ];

        // Mission Templates
        this.missionTemplates = [
            // HEIST missions
            { name: 'CORP VAULT HEIST', type: 'HEIST', difficulty: 'EXTREME', duration: 120000, eddiesMin: 800, eddiesMax: 1500, xpMin: 150, xpMax: 250, rep: 10, injuryChance: 0.5, minLevel: 5, minCool: 10, description: 'Break into Arasaka\'s downtown vault. High security, high reward. Bring your best chrome and nerves of steel.' },
            { name: 'DATA HEIST', type: 'HEIST', difficulty: 'HARD', duration: 90000, eddiesMin: 400, eddiesMax: 700, xpMin: 100, xpMax: 150, rep: 7, injuryChance: 0.35, minLevel: 3, minCool: 7, description: 'Netrunner needs muscle for a data snatch from a corp server room. In and out, no traces.' },
            { name: 'STORE ROBBERY', type: 'HEIST', difficulty: 'EASY', duration: 30000, eddiesMin: 100, eddiesMax: 250, xpMin: 30, xpMax: 60, rep: 2, injuryChance: 0.15, minLevel: 1, minCool: 3, description: 'Local convenience store, minimal security. Quick eddies for a quick job. Don\'t get greedy.' },

            // STREET RACE missions
            { name: 'MIDNIGHT RACE', type: 'RACE', difficulty: 'HARD', duration: 90000, eddiesMin: 500, eddiesMax: 800, xpMin: 120, xpMax: 180, rep: 8, injuryChance: 0.3, minLevel: 4, minReflex: 8, description: 'Illegal street race through downtown. NCPD is watching. Fast reflexes and zero hesitation required.' },
            { name: 'STREET SPRINT', type: 'RACE', difficulty: 'MEDIUM', duration: 60000, eddiesMin: 200, eddiesMax: 400, xpMin: 60, xpMax: 100, rep: 4, injuryChance: 0.2, minLevel: 2, minReflex: 5, description: 'Underground racing circuit needs a rider. Beat the clock, earn the cred. Watch for fixers trying to rig the game.' },
            { name: 'DELIVERY RUN', type: 'RACE', difficulty: 'EASY', duration: 30000, eddiesMin: 80, eddiesMax: 150, xpMin: 25, xpMax: 50, rep: 1, injuryChance: 0.1, minLevel: 1, minReflex: 3, description: 'Get this package to Japantown. Fast. No questions asked. Payment on delivery.' },

            // PROTECTION missions
            { name: 'VIP ESCORT', type: 'PROTECTION', difficulty: 'HARD', duration: 90000, eddiesMin: 450, eddiesMax: 750, xpMin: 110, xpMax: 170, rep: 7, injuryChance: 0.3, minLevel: 4, minCool: 8, description: 'Corp exec needs protection through hostile territory. Expect trouble. Keep them breathing, get paid big.' },
            { name: 'TERRITORY PATROL', type: 'PROTECTION', difficulty: 'MEDIUM', duration: 60000, eddiesMin: 180, eddiesMax: 350, xpMin: 50, xpMax: 90, rep: 3, injuryChance: 0.2, minLevel: 2, minCool: 5, description: 'Make the rounds. Show the colors. Let rival gangs know this turf is spoken for.' },
            { name: 'SHOP WATCH', type: 'PROTECTION', difficulty: 'EASY', duration: 30000, eddiesMin: 70, eddiesMax: 140, xpMin: 20, xpMax: 45, rep: 1, injuryChance: 0.1, minLevel: 1, minCool: 3, description: 'Local shop owner paying for protection. Stand outside, look intimidating. Easy eddies.' },

            // BOUNTY HUNT missions
            { name: 'HIGH VALUE TARGET', type: 'BOUNTY', difficulty: 'EXTREME', duration: 120000, eddiesMin: 900, eddiesMax: 1600, xpMin: 160, xpMax: 260, rep: 12, injuryChance: 0.55, minLevel: 6, minCool: 10, minReflex: 10, description: 'NCPD\'s most wanted. Heavy chrome, heavier firepower. Bring them in alive... or don\'t. Bonus either way.' },
            { name: 'GANG LIEUTENANT', type: 'BOUNTY', difficulty: 'HARD', duration: 90000, eddiesMin: 500, eddiesMax: 850, xpMin: 110, xpMax: 180, rep: 8, injuryChance: 0.4, minLevel: 4, minCool: 7, minReflex: 7, description: 'Rival gang\'s second-in-command has a price on their head. They won\'t go quietly. Expect a fight.' },
            { name: 'STREET THUG', type: 'BOUNTY', difficulty: 'MEDIUM', duration: 60000, eddiesMin: 150, eddiesMax: 300, xpMin: 50, xpMax: 90, rep: 3, injuryChance: 0.25, minLevel: 2, minCool: 5, description: 'Small-time troublemaker causing problems. Track them down, rough them up, collect the bounty.' },

            // SMUGGLING missions
            { name: 'WEAPON SMUGGLING', type: 'SMUGGLING', difficulty: 'EXTREME', duration: 120000, eddiesMin: 1000, eddiesMax: 1700, xpMin: 180, xpMax: 280, rep: 11, injuryChance: 0.45, minLevel: 5, minReflex: 10, description: 'Military-grade hardware crossing borders. NCPD, Militech, and rival fixers all want a piece. Get it across or die trying.' },
            { name: 'CONTRABAND RUN', type: 'SMUGGLING', difficulty: 'MEDIUM', duration: 60000, eddiesMin: 220, eddiesMax: 420, xpMin: 60, xpMax: 110, rep: 4, injuryChance: 0.2, minLevel: 2, minReflex: 6, description: 'Hot goods need moving. Checkpoints everywhere. Keep your head down and your throttle open.' },
            { name: 'PACKAGE DELIVERY', type: 'SMUGGLING', difficulty: 'EASY', duration: 30000, eddiesMin: 90, eddiesMax: 180, xpMin: 30, xpMax: 55, rep: 2, injuryChance: 0.1, minLevel: 1, minReflex: 3, description: 'Unmarked package, no questions. Drop it at the coordinates and forget you ever saw it.' },

            // DEBT COLLECTION missions
            { name: 'CORP DEBT COLLECTION', type: 'DEBT', difficulty: 'HARD', duration: 90000, eddiesMin: 550, eddiesMax: 900, xpMin: 120, xpMax: 190, rep: 9, injuryChance: 0.35, minLevel: 4, minCool: 9, description: 'Executive defaulted on a loan. Corp security means business. Collect the eddies or send a message.' },
            { name: 'ENFORCER WORK', type: 'DEBT', difficulty: 'MEDIUM', duration: 60000, eddiesMin: 200, eddiesMax: 380, xpMin: 55, xpMax: 95, rep: 4, injuryChance: 0.25, minLevel: 2, minCool: 6, description: 'Someone owes the wrong people. Make sure they understand the consequences of missed payments.' },
            { name: 'SMALL COLLECTION', type: 'DEBT', difficulty: 'EASY', duration: 30000, eddiesMin: 60, eddiesMax: 120, xpMin: 20, xpMax: 40, rep: 1, injuryChance: 0.12, minLevel: 1, minCool: 3, description: 'Local debtor been dodging calls. Show up at their door, collect what\'s owed. Nothing personal, just business.' }
        ];


        this.availableMissions = [];
        this.activeMissions = [];
        this.nextMissionId = 1;

        // Initial Member
        const vPortrait = AsciiGenerator.generatePortrait();
        this.recruitMember("V", "Solo", "A mercenary looking for the big leagues.", vPortrait.art);

        // Passive income from territories
        setInterval(() => this.collectTerritoryIncome(), 10000); // Every 10 seconds

        // Event System
        this.eventManager = new EventManager(this);
        this.eventManager.start();

        // Rival Gang System
        this.rivalGangManager = new RivalGangManager(this);
        this.rivalGangManager.initialize();

        this.globalRewardMultiplier = 1;

        // Generate initial missions
        this.generateMissions();

        // Auto-generate missions if low
        setInterval(() => {
            if (this.availableMissions.length < 5) {
                this.addMission();
            }
        }, 10000);
    }

    subscribe(callback) {
        this.listeners.push(callback);
        this.notify();
    }

    notify() {
        const state = {
            eddies: this.eddies,
            rep: this.rep,
            members: this.members,
            territories: this.territories
        };
        this.listeners.forEach(cb => cb(state));
    }

    recruitMember(name, role, description, art) {
        this.members.push({
            id: Date.now(),
            name: name,
            role: role,
            description: description || 'A fresh recruit ready for action.',
            art: art || '',
            status: 'IDLE',
            level: 1,
            xp: 0,
            xpToNext: 100,
            health: 100,
            maxHealth: 100,
            injured: false,
            stats: {
                cool: Math.floor(Math.random() * 5) + 3,
                reflex: Math.floor(Math.random() * 5) + 3
            }
        });
        this.notify();
    }

    addEddies(amount) {
        this.eddies += amount;
        this.notify();
    }

    addRep(amount) {
        this.rep += amount;
        this.notify();
    }

    startMission(memberId, missionId) {
        try {
            console.log(`Attempting to start mission. Member: ${memberId}, Mission: ${missionId}`);
            const member = this.members.find(m => m.id === memberId);
            const mission = this.availableMissions.find(m => m.id === missionId);

            if (!member) {
                console.error('Mission Start Failed: Member not found');
                return { success: false, reason: 'Member not found' };
            }
            if (!mission) {
                console.error('Mission Start Failed: Mission not found');
                return { success: false, reason: 'Mission not found' };
            }
            if (member.status !== 'IDLE') {
                console.error(`Mission Start Failed: Member status is ${member.status}`);
                return { success: false, reason: 'Member is busy' };
            }
            if (member.injured) {
                console.error('Mission Start Failed: Member is injured');
                return { success: false, reason: 'Member is injured' };
            }

            // Check requirements
            if (member.level < mission.minLevel) return { success: false, reason: 'Level too low' };
            if (mission.minCool && member.stats.cool < mission.minCool) return { success: false, reason: 'Cool too low' };
            if (mission.minReflex && member.stats.reflex < mission.minReflex) return { success: false, reason: 'Reflex too low' };

            member.status = 'ON MISSION';
            member.currentMission = mission.name;

            // Add to active missions
            const activeMission = {
                id: Date.now() + Math.random(), // Unique ID for this active instance
                memberId: member.id,
                mission: mission,
                startTime: Date.now(),
                endTime: Date.now() + mission.duration
            };
            this.activeMissions.push(activeMission);

            console.log('Mission Started Successfully:', activeMission);

            this.notify();
            window.dispatchEvent(new CustomEvent('mission-start', { detail: { member: member, mission: mission } }));

            // Mission completes after duration
            setTimeout(() => {
                this.completeMission(member, mission, activeMission.id);
            }, mission.duration);

            return { success: true };
        } catch (error) {
            console.error('CRITICAL ERROR in startMission:', error);
            return { success: false, reason: 'Internal Error' };
        }
    }

    removeMission(missionId) {
        this.availableMissions = this.availableMissions.filter(m => m.id !== missionId);
        this.notify();
    }

    completeMission(member, mission, activeMissionId) {
        // Check if member still exists and was on this mission
        const memberExists = this.members.find(m => m.id === member.id);
        if (!memberExists || memberExists.status !== 'ON MISSION') return;

        // Stat effects - Reflex increases rewards (1% per point)
        const rewardMultiplier = (1 + (member.stats.reflex * 0.01)) * this.globalRewardMultiplier;

        // Calculate rewards based on mission
        const eddiesReward = Math.floor((Math.random() * (mission.eddiesMax - mission.eddiesMin) + mission.eddiesMin) * rewardMultiplier);
        const xpReward = Math.floor((Math.random() * (mission.xpMax - mission.xpMin) + mission.xpMin) * rewardMultiplier);
        const repReward = mission.rep;

        member.status = 'IDLE';
        member.currentMission = null;
        this.addEddies(eddiesReward);
        this.addRep(repReward);

        // Injury Logic - Cool reduces injury chance (2% per point)
        const injuryChance = Math.max(0.05, mission.injuryChance - (member.stats.cool * 0.02));

        if (Math.random() < injuryChance) {
            const damage = Math.floor(Math.random() * 40) + 20; // 20-60 damage
            member.health = Math.max(0, member.health - damage);

            // Only injured if health hits 0
            if (member.health <= 0) {
                member.health = 0;
                member.injured = true;
            }
        }

        // Add XP and check for level up
        member.xp += xpReward;

        let leveledUp = false;
        while (member.xp >= member.xpToNext) {
            member.xp -= member.xpToNext;
            member.level++;
            member.xpToNext = Math.floor(member.xpToNext * 1.5);

            // Stat increases
            member.stats.cool += Math.floor(Math.random() * 2) + 1;
            member.stats.reflex += Math.floor(Math.random() * 2) + 1;

            // Health increase on level up
            member.maxHealth += 10;
            member.health = member.maxHealth; // Full heal on level up

            leveledUp = true;
        }

        // Remove from active missions
        this.activeMissions = this.activeMissions.filter(m => m.id !== activeMissionId);

        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('mission-complete', {
            detail: {
                member: member,
                mission: mission,
                rewards: { eddies: eddiesReward, xp: xpReward, rep: repReward },
                leveledUp: leveledUp,
                injured: member.injured
            }
        }));

        this.notify();
    }

    generateMissions() {
        // Generate 4-5 random missions from templates
        const numMissions = Math.floor(Math.random() * 2) + 4; // 4-5 missions
        this.availableMissions = [];

        // Filter missions based on Rep
        // Easy: 0+, Medium: 10+, Hard: 30+, Extreme: 50+
        let allowedDifficulties = ['EASY'];
        if (this.rep >= 10) allowedDifficulties.push('MEDIUM');
        if (this.rep >= 30) allowedDifficulties.push('HARD');
        if (this.rep >= 50) allowedDifficulties.push('EXTREME');

        // Filter templates
        const availableTemplates = this.missionTemplates.filter(t => allowedDifficulties.includes(t.difficulty));

        // Fallback if no templates found (shouldn't happen)
        const pool = availableTemplates.length > 0 ? availableTemplates : this.missionTemplates;

        const shuffled = [...pool].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(numMissions, shuffled.length); i++) {
            const template = shuffled[i];
            this.availableMissions.push({
                ...template,
                id: this.nextMissionId++
            });
        }

        this.notify();
    }

    addMission() {
        // Filter missions based on Rep
        let allowedDifficulties = ['EASY'];
        if (this.rep >= 10) allowedDifficulties.push('MEDIUM');
        if (this.rep >= 30) allowedDifficulties.push('HARD');
        if (this.rep >= 50) allowedDifficulties.push('EXTREME');

        // Filter templates
        const availableTemplates = this.missionTemplates.filter(t => allowedDifficulties.includes(t.difficulty));
        const pool = availableTemplates.length > 0 ? availableTemplates : this.missionTemplates;

        const template = pool[Math.floor(Math.random() * pool.length)];

        this.availableMissions.push({
            ...template,
            id: this.nextMissionId++
        });

        this.notify();
        // Optional: Dispatch event if we want UI toast
        window.dispatchEvent(new CustomEvent('game-event', {
            detail: { message: 'NEW MISSION AVAILABLE', type: 'good' }
        }));
    }

    refreshMissions() {
        const cost = 50;
        if (this.eddies < cost) return false;

        this.addEddies(-cost);
        this.generateMissions();

        return true;
    }

    getMissionProgress(memberId) {
        const activeMission = this.activeMissions.find(m => m.memberId === memberId);
        if (!activeMission) return null;

        const now = Date.now();
        const elapsed = now - activeMission.startTime;
        const total = activeMission.endTime - activeMission.startTime;
        const remaining = Math.max(0, activeMission.endTime - now);

        return {
            mission: activeMission.mission,
            progress: elapsed / total,
            remainingMs: remaining,
            remainingSeconds: Math.ceil(remaining / 1000)
        };
    }

    memberMeetsMissionRequirements(memberId, missionId) {
        const member = this.members.find(m => m.id === memberId);
        const mission = this.availableMissions.find(m => m.id === missionId);

        if (!member || !mission) return false;
        if (member.status !== 'IDLE' || member.injured) return false;
        if (member.level < mission.minLevel) return false;
        if (mission.minCool && member.stats.cool < mission.minCool) return false;
        if (mission.minReflex && member.stats.reflex < mission.minReflex) return false;

        return true;
    }

    healMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member && member.injured) {
            const healCost = 100;
            if (this.eddies >= healCost) {
                this.addEddies(-healCost);
                member.health = member.maxHealth;
                member.injured = false;
                member.status = 'IDLE';
                this.notify();
                return true;
            }
        }
        return false;
    }

    upgradeMember(memberId, upgradeType) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return false;

        let cost = 0;
        let success = false;

        switch (upgradeType) {
            case 'cool':
                cost = member.stats.cool * 100;
                if (this.eddies >= cost) {
                    this.addEddies(-cost);
                    member.stats.cool += 2;
                    success = true;
                }
                break;
            case 'reflex':
                cost = member.stats.reflex * 100;
                if (this.eddies >= cost) {
                    this.addEddies(-cost);
                    member.stats.reflex += 2;
                    success = true;
                }
                break;
            case 'health':
                cost = 500;
                if (this.eddies >= cost) {
                    this.addEddies(-cost);
                    member.maxHealth += 20;
                    member.health = member.maxHealth;
                    success = true;
                }
                break;
        }

        if (success) {
            this.notify();
        }
        return success;
    }

    captureTerritory(territoryId) {
        const territory = this.territories.find(t => t.id === territoryId);
        // Can only capture if not controlled by player AND not controlled by rival gang
        if (territory && !territory.controlled && !territory.rivalGang) {
            const cost = territory.income * 10; // Cost is 10x the income
            if (this.eddies >= cost) {
                this.addEddies(-cost);
                territory.controlled = true;
                this.notify();
                return true;
            }
        }
        return false;
    }

    collectTerritoryIncome() {
        const income = this.territories
            .filter(t => t.controlled)
            .reduce((sum, t) => sum + t.income, 0);

        if (income > 0) {
            this.addEddies(income);
            window.dispatchEvent(new CustomEvent('territory-income', { detail: { amount: income } }));
        }
    }

    loseTerritory(territoryId) {
        const territory = this.territories.find(t => t.id === territoryId);
        if (territory && territory.controlled) {
            territory.controlled = false;
            this.notify();
        }
    }

    setRewardMultiplier(value, duration) {
        this.globalRewardMultiplier = value;
        setTimeout(() => {
            this.globalRewardMultiplier = 1;
            window.dispatchEvent(new CustomEvent('game-event', {
                detail: { message: 'MARKET NORMALIZED.', type: 'neutral' }
            }));
        }, duration);
    }

    attackTerritory(territoryId, memberIds) {
        // Get members for the attack
        const attackers = this.members.filter(m => memberIds.includes(m.id));

        // Check if all members are available
        const unavailable = attackers.filter(m => m.status !== 'IDLE' || m.injured);
        if (unavailable.length > 0) {
            return { success: false, message: 'Some members are unavailable!' };
        }

        // Perform the attack
        const result = this.rivalGangManager.attackTerritory(territoryId, attackers);

        // Update state
        this.notify();

        // Award loot if successful
        if (result.success && result.loot) {
            this.addEddies(result.loot);
            this.addRep(10);
        }

        return result;
    }
}

