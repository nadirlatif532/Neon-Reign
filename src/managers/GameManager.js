import { EventManager } from './EventManager.js';
import { RivalGangManager } from './RivalGangManager.js';

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

        // Initial Member
        this.recruitMember("V", "Solo");

        // Passive income from territories
        setInterval(() => this.collectTerritoryIncome(), 10000); // Every 10 seconds

        // Event System
        this.eventManager = new EventManager(this);
        this.eventManager.start();

        // Rival Gang System
        this.rivalGangManager = new RivalGangManager(this);
        this.rivalGangManager.initialize();

        this.globalRewardMultiplier = 1;
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

    recruitMember(name, role) {
        this.members.push({
            id: Date.now(),
            name: name,
            role: role,
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

    startMission(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member && member.status === 'IDLE' && !member.injured) {
            member.status = 'ON MISSION';
            this.notify();
            window.dispatchEvent(new CustomEvent('mission-start', { detail: { member: member } }));

            // Mission completes after 5 seconds
            setTimeout(() => {
                this.completeMission(member);
            }, 5000);
        }
    }

    completeMission(member) {
        // Stat effects
        // Reflex increases rewards (1% per point)
        // Stat effects
        // Reflex increases rewards (1% per point)
        const rewardMultiplier = (1 + (member.stats.reflex * 0.01)) * this.globalRewardMultiplier;

        // Random rewards with multiplier
        const eddiesReward = Math.floor((Math.random() * 200 + 100) * rewardMultiplier); // 100-300 base
        const xpReward = Math.floor((Math.random() * 50 + 50) * rewardMultiplier); // 50-100 base
        const repReward = Math.floor(Math.random() * 5) + 1; // 1-5

        member.status = 'IDLE';
        this.addEddies(eddiesReward);
        this.addRep(repReward);

        // Injury Logic
        // Cool reduces injury chance (2% per point)
        const baseInjuryChance = 0.3;
        const injuryChance = Math.max(0.05, baseInjuryChance - (member.stats.cool * 0.02));

        if (Math.random() < injuryChance) {
            const damage = Math.floor(Math.random() * 40) + 20; // 20-60 damage
            member.health = Math.max(0, member.health - damage);

            // Only injured if health hits 0
            if (member.health <= 0) {
                member.health = 0;
                member.injured = true;
                member.status = 'INJURED';
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

        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('mission-complete', {
            detail: {
                member: member,
                rewards: { eddies: eddiesReward, xp: xpReward, rep: repReward },
                leveledUp: leveledUp,
                injured: member.injured
            }
        }));

        this.notify();
    }

    healMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member && member.injured) {
            const healCost = 200;
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
        if (territory && !territory.controlled) {
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

