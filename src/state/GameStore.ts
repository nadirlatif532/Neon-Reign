import { map } from 'nanostores';
import { RivalGangManager } from '@/managers/RivalGangManager';

export type RiderClass = 'SOLO' | 'NETRUNNER' | 'TECHIE' | 'NOMAD' | 'FIXER';

export const RIDER_CLASSES: Record<RiderClass, { name: string; description: string; passive: string }> = {
    SOLO: { name: 'Solo', description: 'Combat specialist.', passive: '+10% Success Chance on HEIST/BOUNTY missions.' },
    NETRUNNER: { name: 'Netrunner', description: 'Hacking expert.', passive: '+15% XP gain on all missions.' },
    TECHIE: { name: 'Techie', description: 'Engineering wizard.', passive: '-20% Injury Chance for team.' },
    NOMAD: { name: 'Nomad', description: 'Transport expert.', passive: '-15% Mission Duration.' },
    FIXER: { name: 'Fixer', description: 'Business savvy.', passive: '+15% Eddies reward.' }
};

export interface Member {
    id: number;
    name: string;
    class: RiderClass;
    description: string;
    art: string;
    status: 'IDLE' | 'ON MISSION' | 'INJURED';
    level: number;
    xp: number;
    xpToNext: number;
    health: number;
    maxHealth: number;
    injured: boolean;
    stats: {
        cool: number;
        reflex: number;
    };
    currentMission: string | null;
}

export interface Mission {
    id: number;
    name: string;
    type: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
    difficultyRating: number; // New: Numeric value for math (50, 100, 150, 200)
    duration: number;
    eddiesMin: number;
    eddiesMax: number;
    xpMin: number;
    xpMax: number;
    rep: number;
    injuryChance: number;
    minLevel: number;
    minCool?: number;
    minReflex?: number;
    description: string;
}

export interface ActiveMission {
    id: number;
    memberIds: number[]; // Changed: Array of member IDs
    mission: Mission;
    startTime: number;
    endTime: number;
}

export interface Territory {
    id: number;
    name: string;
    controlled: boolean;
    income: number;
    rivalGang?: string | null;
}

export interface GameState {
    eddies: number;
    rep: number;
    gangName: string;
    members: Member[];
    territories: Territory[];
    availableMissions: Mission[];
    activeMissions: ActiveMission[];
    activeEncounters: { id: string; encounterId: string; x: number; y: number; expiresAt: number }[];
    loadingProgress: number;
}

export const gameStore = map<GameState>({
    eddies: 1000,
    rep: 10,
    gangName: "V's Gang",
    members: [
        {
            id: 1,
            name: 'V',
            class: 'SOLO',
            description: 'Your first crew member and right-hand.',
            art: 'biker',
            status: 'IDLE',
            level: 1,
            xp: 0,
            xpToNext: 100,
            health: 100,
            maxHealth: 100,
            injured: false,
            stats: {
                cool: 4,
                reflex: 4
            },
            currentMission: null
        }
    ],
    territories: [
        { id: 1, name: 'WATSON', controlled: false, income: 50 },
        { id: 2, name: 'WESTBROOK', controlled: false, income: 75 },
        { id: 3, name: 'CITY CENTER', controlled: false, income: 100 },
        { id: 4, name: 'SANTO DOMINGO', controlled: false, income: 60 },
        { id: 5, name: 'PACIFICA', controlled: false, income: 80 },
        { id: 6, name: 'THE GARAGE', controlled: true, income: 25 }
    ],
    availableMissions: [],
    activeMissions: [],
    activeEncounters: [],
    loadingProgress: 0
});

// --- Actions ---

export const updateLoadingProgress = (progress: number) => {
    gameStore.setKey('loadingProgress', progress);
};

export const addEddies = (amount: number) => {
    const current = gameStore.get().eddies;
    gameStore.setKey('eddies', Math.max(0, current + amount));
};

export const addRep = (amount: number) => {
    const current = gameStore.get().rep;
    gameStore.setKey('rep', current + amount);
};

export const setGangName = (name: string) => {
    gameStore.setKey('gangName', name || "V's Gang");
};

export const recruitMember = (name: string, description: string, art: string = '', riderClass?: RiderClass) => {
    const classes = Object.keys(RIDER_CLASSES) as RiderClass[];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];

    const member: Member = {
        id: Date.now(),
        name,
        class: riderClass || randomClass,
        description: description || 'A fresh recruit ready for action.',
        art,
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
        },
        currentMission: null
    };

    const members = [...gameStore.get().members, member];
    gameStore.setKey('members', members);
};

export const healMember = (memberId: number): boolean => {
    const state = gameStore.get();
    const member = state.members.find(m => m.id === memberId);

    if (member && member.injured) {
        const healCost = 200;
        if (state.eddies >= healCost) {
            addEddies(-healCost);
            member.health = member.maxHealth;
            member.injured = false;
            member.status = 'IDLE';
            gameStore.setKey('members', [...state.members]);
            return true;
        }
    }
    return false;
};

export const upgradeMember = (memberId: number, upgradeType: 'cool' | 'reflex' | 'health'): boolean => {
    const state = gameStore.get();
    const member = state.members.find(m => m.id === memberId);

    if (!member) return false;

    let cost = 0;
    let success = false;

    switch (upgradeType) {
        case 'cool':
            cost = member.stats.cool * 100;
            if (state.eddies >= cost) {
                addEddies(-cost);
                member.stats.cool += 2;
                success = true;
            }
            break;
        case 'reflex':
            cost = member.stats.reflex * 100;
            if (state.eddies >= cost) {
                addEddies(-cost);
                member.stats.reflex += 2;
                success = true;
            }
            break;
        case 'health':
            cost = 500;
            if (state.eddies >= cost) {
                addEddies(-cost);
                member.maxHealth += 20;
                member.health = member.maxHealth;
                success = true;
            }
            break;
    }

    if (success) {
        gameStore.setKey('members', [...state.members]);
    }
    return success;
};

export const startMission = (memberIds: number[], missionId: number, durationOverride: number | null = null) => {
    const state = gameStore.get();
    const mission = state.availableMissions.find(m => m.id === missionId);

    if (!mission) return { success: false, reason: 'Mission not found' };
    if (memberIds.length === 0) return { success: false, reason: 'No members selected' };

    const members = state.members.filter(m => memberIds.includes(m.id));

    // Validate all members
    for (const member of members) {
        if (member.status !== 'IDLE') return { success: false, reason: `${member.name} is busy` };
        if (member.injured) return { success: false, reason: `${member.name} is injured` };
        if (member.level < mission.minLevel) return { success: false, reason: `${member.name} level too low` };
        if (mission.minCool && member.stats.cool < mission.minCool) return { success: false, reason: `${member.name} Cool too low` };
        if (mission.minReflex && member.stats.reflex < mission.minReflex) return { success: false, reason: `${member.name} Reflex too low` };
    }

    // Update members status
    const updatedMembers = state.members.map(m =>
        memberIds.includes(m.id) ? { ...m, status: 'ON MISSION' as const, currentMission: mission.name } : m
    );
    gameStore.setKey('members', updatedMembers);

    // Add active mission
    // Calculate Duration with Nomad Passive
    let duration = durationOverride !== null ? durationOverride : mission.duration;
    const hasNomad = members.some(m => m.class === 'NOMAD');
    if (hasNomad) {
        duration = Math.floor(duration * 0.85); // 15% reduction
    }

    const activeMission: ActiveMission = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        memberIds,
        mission,
        startTime: Date.now(),
        endTime: Date.now() + duration
    };

    const updatedActiveMissions = [...state.activeMissions, activeMission];
    gameStore.setKey('activeMissions', updatedActiveMissions);

    // Remove mission from available list and replace with a new one
    removeMission(missionId);
    generateSingleMission();

    // Schedule completion
    setTimeout(() => {
        completeMission(activeMission.id);
    }, duration);

    return { success: true };
};

export const completeMission = (activeMissionId: number) => {
    const state = gameStore.get();
    const activeMission = state.activeMissions.find(m => m.id === activeMissionId);
    if (!activeMission) return;

    const mission = activeMission.mission;
    const members = state.members.filter(m => activeMission.memberIds.includes(m.id));

    if (members.length === 0) return;

    // --- Team Logic ---
    const teamSize = members.length;

    // Calculate Team Power
    // New Formula: (Sum of Stats * 2) + (Sum of Levels * 5)
    let teamPower = members.reduce((sum, m) => {
        return sum + ((m.stats.cool + m.stats.reflex) * 2) + (m.level * 5);
    }, 0);

    // Solo Passive: +10% Success Chance (effectively +10% power vs difficulty) on HEIST/BOUNTY
    const hasSolo = members.some(m => m.class === 'SOLO');
    if (hasSolo && (mission.type === 'HEIST' || mission.type === 'BOUNTY')) {
        teamPower *= 1.1;
    }

    // Difficulty Rating (Default to 50 if missing)
    const difficulty = mission.difficultyRating || 50;

    // Success Chance: (Team Power / Difficulty) * 100
    // Cap at 95%, Min 5%
    const successChance = Math.min(0.95, Math.max(0.05, teamPower / difficulty));
    const isSuccess = Math.random() < successChance;

    // Rewards Calculation
    let eddiesReward = 0;
    let xpReward = 0;
    let repReward = 0;
    let leveledUpMembers: number[] = [];
    let injuredMembers: number[] = [];

    if (isSuccess) {
        const rewardMultiplier = 1 + (teamPower * 0.005); // Reduced bonus multiplier
        eddiesReward = Math.floor((Math.random() * (mission.eddiesMax - mission.eddiesMin) + mission.eddiesMin) * rewardMultiplier);
        xpReward = Math.floor((Math.random() * (mission.xpMax - mission.xpMin) + mission.xpMin)); // Base XP per person
        repReward = mission.rep;

        // Fixer Passive: +15% Eddies
        if (members.some(m => m.class === 'FIXER')) {
            eddiesReward = Math.floor(eddiesReward * 1.15);
        }

        addEddies(eddiesReward);
        addRep(repReward);
    } else {
        // Failure: Small consolation prize
        eddiesReward = Math.floor(mission.eddiesMin * 0.1); // 10% of min eddies
        xpReward = Math.floor(mission.xpMin * 0.2);
        addEddies(eddiesReward); // Ensure eddies are added on failure too
    }

    // Netrunner Passive: +15% XP
    if (members.some(m => m.class === 'NETRUNNER')) {
        xpReward = Math.floor(xpReward * 1.15);
    }

    // Injury Logic
    // Risk reduced by 5% per extra team member
    const riskReduction = (teamSize - 1) * 0.05;
    let baseInjuryChance = Math.max(0.05, mission.injuryChance - riskReduction);

    // Techie Passive: -20% Injury Chance
    if (members.some(m => m.class === 'TECHIE')) {
        baseInjuryChance = Math.max(0, baseInjuryChance - 0.2);
    }

    // If mission was successful, injury chance is HALVED
    if (isSuccess) {
        baseInjuryChance *= 0.5;
    }

    // NEW: Catastrophic Failure Check (All members injured on failure chance)
    let catastrophicFailure = false;
    if (!isSuccess && Math.random() < baseInjuryChance) {
        catastrophicFailure = true;
    }

    // Process each member
    const updatedMembers = state.members.map(m => {
        if (activeMission.memberIds.includes(m.id)) {
            let newHealth = m.health;
            let isInjured = false;

            // Roll for injury
            // Higher stats reduce individual risk slightly too
            const personalRisk = Math.max(0.01, baseInjuryChance - (m.stats.cool * 0.01));

            if (catastrophicFailure) {
                // Total wipeout logic
                newHealth = 0;
                isInjured = true;
                injuredMembers.push(m.id);
            } else if (Math.random() < personalRisk) {
                const damage = Math.floor(Math.random() * 30) + 10;
                newHealth = Math.max(0, m.health - damage);
                if (newHealth <= 0) {
                    newHealth = 0;
                    isInjured = true;
                    injuredMembers.push(m.id);
                }
            }

            // XP & Level Up
            let newXp = m.xp + xpReward;
            let newLevel = m.level;
            let newXpToNext = m.xpToNext;
            let newMaxHealth = m.maxHealth;
            let newCool = m.stats.cool;
            let newReflex = m.stats.reflex;

            while (newXp >= newXpToNext) {
                newXp -= newXpToNext;
                newLevel++;
                newXpToNext = Math.floor(newXpToNext * 1.5);
                newCool += Math.floor(Math.random() * 2) + 1;
                newReflex += Math.floor(Math.random() * 2) + 1;
                newMaxHealth += 10;
                newHealth = newMaxHealth; // Full heal on level up
                leveledUpMembers.push(m.id);
            }

            return {
                ...m,
                status: isInjured ? 'INJURED' : 'IDLE',
                currentMission: null,
                health: newHealth,
                maxHealth: newMaxHealth,
                injured: isInjured,
                xp: newXp,
                level: newLevel,
                xpToNext: newXpToNext,
                stats: { cool: newCool, reflex: newReflex }
            } as Member;
        }
        return m;
    });

    gameStore.setKey('members', updatedMembers);

    // Remove active mission
    const updatedActiveMissions = state.activeMissions.filter(m => m.id !== activeMissionId);
    gameStore.setKey('activeMissions', updatedActiveMissions);

    // Dispatch Event for UI
    window.dispatchEvent(new CustomEvent('mission-complete', {
        detail: {
            memberIds: activeMission.memberIds,
            mission,
            success: isSuccess,
            rewards: { eddies: eddiesReward, xp: xpReward, rep: repReward },
            leveledUpMembers,
            injuredMembers
        }
    }));
};

// Mission Templates
const MISSION_TEMPLATES: Omit<Mission, 'id'>[] = [
    // HEIST missions
    { name: 'CORP VAULT HEIST', type: 'HEIST', difficulty: 'EXTREME', difficultyRating: 150, duration: 120000, eddiesMin: 800, eddiesMax: 1500, xpMin: 150, xpMax: 250, rep: 10, injuryChance: 0.5, minLevel: 5, minCool: 10, description: 'Break into Arasaka\'s downtown vault. High security, high reward. Bring your best chrome and nerves of steel.' },
    { name: 'DATA HEIST', type: 'HEIST', difficulty: 'HARD', difficultyRating: 100, duration: 90000, eddiesMin: 400, eddiesMax: 700, xpMin: 100, xpMax: 150, rep: 7, injuryChance: 0.35, minLevel: 3, minCool: 7, description: 'Netrunner needs muscle for a data snatch from a corp server room. In and out, no traces.' },
    { name: 'STORE ROBBERY', type: 'HEIST', difficulty: 'EASY', difficultyRating: 30, duration: 30000, eddiesMin: 100, eddiesMax: 250, xpMin: 30, xpMax: 60, rep: 2, injuryChance: 0.15, minLevel: 1, minCool: 3, description: 'Local convenience store, minimal security. Quick eddies for a quick job. Don\'t get greedy.' },
    { name: 'BANK HEIST', type: 'HEIST', difficulty: 'EXTREME', difficultyRating: 170, duration: 120000, eddiesMin: 1200, eddiesMax: 2000, xpMin: 180, xpMax: 270, rep: 13, injuryChance: 0.5, minLevel: 6, minCool: 11, description: 'NCPD pension fund vault. Retire off this score or die trying. Corpo security is no joke.' },
    { name: 'APARTMENT BURGLARY', type: 'HEIST', difficulty: 'MEDIUM', difficultyRating: 55, duration: 60000, eddiesMin: 180, eddiesMax: 320, xpMin: 45, xpMax: 80, rep: 3, injuryChance: 0.18, minLevel: 2, minCool: 5, description: 'Rich corpo lives here. They\'re out of town. In and out before building security notices.' },

    // STREET RACE missions
    { name: 'MIDNIGHT RACE', type: 'RACE', difficulty: 'HARD', difficultyRating: 110, duration: 90000, eddiesMin: 500, eddiesMax: 800, xpMin: 120, xpMax: 180, rep: 8, injuryChance: 0.3, minLevel: 4, minReflex: 8, description: 'Illegal street race through downtown. NCPD is watching. Fast reflexes and zero hesitation required.' },
    { name: 'STREET SPRINT', type: 'RACE', difficulty: 'MEDIUM', difficultyRating: 60, duration: 60000, eddiesMin: 200, eddiesMax: 400, xpMin: 60, xpMax: 100, rep: 4, injuryChance: 0.2, minLevel: 2, minReflex: 5, description: 'Underground racing circuit needs a rider. Beat the clock, earn the cred. Watch for fixers trying to rig the game.' },
    { name: 'DELIVERY RUN', type: 'RACE', difficulty: 'EASY', difficultyRating: 25, duration: 30000, eddiesMin: 80, eddiesMax: 150, xpMin: 25, xpMax: 50, rep: 1, injuryChance: 0.1, minLevel: 1, minReflex: 3, description: 'Get this package to Japantown. Fast. No questions asked. Payment on delivery.' },
    { name: 'HIGHWAY CHASE', type: 'RACE', difficulty: 'HARD', difficultyRating: 105, duration: 90000, eddiesMin: 480, eddiesMax: 720, xpMin: 105, xpMax: 165, rep: 7, injuryChance: 0.32, minLevel: 4, minReflex: 9, description: 'Outrun MaxTac on the expressway. Survive and the payout is yours. Get caught and you\'re flatlined.' },
    { name: 'COURIER EXPRESS', type: 'RACE', difficulty: 'MEDIUM', difficultyRating: 50, duration: 60000, eddiesMin: 160, eddiesMax: 280, xpMin: 50, xpMax: 85, rep: 3, injuryChance: 0.15, minLevel: 2, minReflex: 6, description: 'Time-sensitive delivery across the city. Traffic is hell. Don\'t be late.' },

    // PROTECTION missions
    { name: 'VIP ESCORT', type: 'PROTECTION', difficulty: 'HARD', difficultyRating: 120, duration: 90000, eddiesMin: 450, eddiesMax: 750, xpMin: 110, xpMax: 170, rep: 7, injuryChance: 0.3, minLevel: 4, minCool: 8, description: 'Corp exec needs protection through hostile territory. Expect trouble. Keep them breathing, get paid big.' },
    { name: 'TERRITORY PATROL', type: 'PROTECTION', difficulty: 'MEDIUM', difficultyRating: 50, duration: 60000, eddiesMin: 180, eddiesMax: 350, xpMin: 50, xpMax: 90, rep: 3, injuryChance: 0.2, minLevel: 2, minCool: 5, description: 'Make the rounds. Show the colors. Let rival gangs know this turf is spoken for.' },
    { name: 'SHOP WATCH', type: 'PROTECTION', difficulty: 'EASY', difficultyRating: 20, duration: 30000, eddiesMin: 70, eddiesMax: 140, xpMin: 20, xpMax: 45, rep: 1, injuryChance: 0.1, minLevel: 1, minCool: 3, description: 'Local shop owner paying for protection. Stand outside, look intimidating. Easy eddies.' },
    { name: 'CONVOY DEFENSE', type: 'PROTECTION', difficulty: 'EXTREME', difficultyRating: 165, duration: 120000, eddiesMin: 850, eddiesMax: 1400, xpMin: 170, xpMax: 240, rep: 11, injuryChance: 0.48, minLevel: 6, minCool: 11, description: 'Militech convoy moving through Pacifica. Everyone wants a piece. Keep it secure, earn corpo trust.' },
    { name: 'NIGHTCLUB SECURITY', type: 'PROTECTION', difficulty: 'MEDIUM', difficultyRating: 65, duration: 60000, eddiesMin: 220, eddiesMax: 380, xpMin: 65, xpMax: 105, rep: 4, injuryChance: 0.22, minLevel: 3, minCool: 6, description: 'High-profile club needs muscle tonight. VIPs, drugged-up gonks, and rival gangs. Keep it under control.' },

    // BOUNTY HUNT missions
    { name: 'HIGH VALUE TARGET', type: 'BOUNTY', difficulty: 'EXTREME', difficultyRating: 180, duration: 120000, eddiesMin: 900, eddiesMax: 1600, xpMin: 160, xpMax: 260, rep: 12, injuryChance: 0.55, minLevel: 6, minCool: 10, minReflex: 10, description: 'NCPD\'s most wanted. Heavy chrome, heavier firepower. Bring them in alive... or don\'t. Bonus either way.' },
    { name: 'GANG LIEUTENANT', type: 'BOUNTY', difficulty: 'HARD', difficultyRating: 130, duration: 90000, eddiesMin: 500, eddiesMax: 850, xpMin: 110, xpMax: 180, rep: 8, injuryChance: 0.4, minLevel: 4, minCool: 7, minReflex: 7, description: 'Rival gang\'s second-in-command has a price on their head. They won\'t go quietly. Expect a fight.' },
    { name: 'STREET THUG', type: 'BOUNTY', difficulty: 'MEDIUM', difficultyRating: 55, duration: 60000, eddiesMin: 150, eddiesMax: 300, xpMin: 50, xpMax: 90, rep: 3, injuryChance: 0.25, minLevel: 2, minCool: 5, description: 'Small-time troublemaker causing problems. Track them down, rough them up, collect the bounty.' },
    { name: 'CYBERPSYCHO HUNT', type: 'BOUNTY', difficulty: 'EXTREME', difficultyRating: 190, duration: 120000, eddiesMin: 1100, eddiesMax: 1800, xpMin: 190, xpMax: 280, rep: 14, injuryChance: 0.6, minLevel: 7, minCool: 12, minReflex: 11, description: 'Cyberpsycho on rampage in Watson. MaxTac will pay premium to stop them. Approach with extreme caution.' },
    { name: 'SKIP TRACER', type: 'BOUNTY', difficulty: 'EASY', difficultyRating: 28, duration: 30000, eddiesMin: 90, eddiesMax: 170, xpMin: 28, xpMax: 52, rep: 2, injuryChance: 0.13, minLevel: 1, minCool: 4, description: 'Debtor skipped town. Track them down, bring them back. They probably won\'t fight much.' },

    // SMUGGLING missions
    { name: 'WEAPON SMUGGLING', type: 'SMUGGLING', difficulty: 'EXTREME', difficultyRating: 160, duration: 120000, eddiesMin: 1000, eddiesMax: 1700, xpMin: 180, xpMax: 280, rep: 11, injuryChance: 0.45, minLevel: 5, minReflex: 10, description: 'Military-grade hardware crossing borders. NCPD, Militech, and rival fixers all want a piece. Get it across or die trying.' },
    { name: 'CONTRABAND RUN', type: 'SMUGGLING', difficulty: 'MEDIUM', difficultyRating: 70, duration: 60000, eddiesMin: 220, eddiesMax: 420, xpMin: 60, xpMax: 110, rep: 4, injuryChance: 0.2, minLevel: 2, minReflex: 6, description: 'Hot goods need moving. Checkpoints everywhere. Keep your head down and your throttle open.' },
    { name: 'PACKAGE DELIVERY', type: 'SMUGGLING', difficulty: 'EASY', difficultyRating: 25, duration: 30000, eddiesMin: 90, eddiesMax: 180, xpMin: 30, xpMax: 55, rep: 2, injuryChance: 0.1, minLevel: 1, minReflex: 3, description: 'Unmarked package, no questions. Drop it at the coordinates and forget you ever saw it.' },
    { name: 'DRUG TRAFFICKING', type: 'SMUGGLING', difficulty: 'HARD', difficultyRating: 125, duration: 90000, eddiesMin: 520, eddiesMax: 820, xpMin: 115, xpMax: 175, rep: 8, injuryChance: 0.38, minLevel: 4, minReflex: 9, description: 'Moving high-grade synthcoke for the Valentinos. NCPD has patrols everywhere. One wrong move and you\'re done.' },
    { name: 'BLACK MARKET TECH', type: 'SMUGGLING', difficulty: 'MEDIUM', difficultyRating: 75, duration: 60000, eddiesMin: 250, eddiesMax: 440, xpMin: 70, xpMax: 115, rep: 5, injuryChance: 0.23, minLevel: 3, minReflex: 7, description: 'Stolen cyberware needs to disappear. Ripterdocs are paying premium. Don\'t let corpo sec catch you.' },

    // DEBT COLLECTION missions
    { name: 'CORP DEBT COLLECTION', type: 'DEBT', difficulty: 'HARD', difficultyRating: 90, duration: 90000, eddiesMin: 550, eddiesMax: 900, xpMin: 120, xpMax: 190, rep: 9, injuryChance: 0.35, minLevel: 4, minCool: 9, description: 'Executive defaulted on a loan. Corp security means business. Collect the eddies or send a message.' },
    { name: 'ENFORCER WORK', type: 'DEBT', difficulty: 'MEDIUM', difficultyRating: 50, duration: 60000, eddiesMin: 200, eddiesMax: 380, xpMin: 55, xpMax: 95, rep: 4, injuryChance: 0.25, minLevel: 2, minCool: 6, description: 'Someone owes the wrong people. Make sure they understand the consequences of missed payments.' },
    { name: 'SMALL COLLECTION', type: 'DEBT', difficulty: 'EASY', difficultyRating: 20, duration: 30000, eddiesMin: 60, eddiesMax: 120, xpMin: 20, xpMax: 40, rep: 1, injuryChance: 0.12, minLevel: 1, minCool: 3, description: 'Local debtor been dodging calls. Show up at their door, collect what\'s owed. Nothing personal, just business.' },
    { name: 'LOAN SHARK ENFORCING', type: 'DEBT', difficulty: 'HARD', difficultyRating: 115, duration: 90000, eddiesMin: 480, eddiesMax: 780, xpMin: 105, xpMax: 165, rep: 7, injuryChance: 0.36, minLevel: 4, minCool: 8, description: 'High-stakes loan gone bad. Debtor has hired protection. Collect by any means necessary.' },
    { name: 'REPO JOB', type: 'DEBT', difficulty: 'MEDIUM', difficultyRating: 60, duration: 60000, eddiesMin: 190, eddiesMax: 340, xpMin: 58, xpMax: 98, rep: 4, injuryChance: 0.21, minLevel: 2, minCool: 5, description: 'Repossess illegal cyberware from a defaulted client. They won\'t give it up easily.' }
];

export const generateMissions = () => {
    const state = gameStore.get();
    const numMissions = Math.floor(Math.random() * 2) + 4;

    let allowedDifficulties = ['EASY'];
    if (state.rep >= 10) allowedDifficulties.push('MEDIUM');
    if (state.rep >= 30) allowedDifficulties.push('HARD');
    if (state.rep >= 50) allowedDifficulties.push('EXTREME');

    const availableTemplates = MISSION_TEMPLATES.filter(t => allowedDifficulties.includes(t.difficulty));
    const pool = availableTemplates.length > 0 ? availableTemplates : MISSION_TEMPLATES;

    // Shuffle and select unique missions
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const newMissions: Mission[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < Math.min(numMissions, shuffled.length); i++) {
        const template = shuffled[i];
        if (!usedNames.has(template.name)) {
            newMissions.push({
                ...template,
                id: Date.now() + i
            });
            usedNames.add(template.name);
        }
    }

    gameStore.setKey('availableMissions', newMissions);
};

export const generateSingleMission = () => {
    const state = gameStore.get();
    let allowedDifficulties = ['EASY'];
    if (state.rep >= 10) allowedDifficulties.push('MEDIUM');
    if (state.rep >= 30) allowedDifficulties.push('HARD');
    if (state.rep >= 50) allowedDifficulties.push('EXTREME');

    const availableTemplates = MISSION_TEMPLATES.filter(t => allowedDifficulties.includes(t.difficulty));
    const pool = availableTemplates.length > 0 ? availableTemplates : MISSION_TEMPLATES;

    // Get names of currently available missions
    const existingNames = new Set(state.availableMissions.map(m => m.name));

    // Filter out duplicates
    const uniquePool = pool.filter(t => !existingNames.has(t.name));
    const finalPool = uniquePool.length > 0 ? uniquePool : pool;

    const template = finalPool[Math.floor(Math.random() * finalPool.length)];
    const newMission = {
        ...template,
        id: Date.now() + Math.floor(Math.random() * 1000)
    };

    gameStore.setKey('availableMissions', [...state.availableMissions, newMission]);
};

export const refreshMissions = () => {
    const state = gameStore.get();
    if (state.eddies >= 50) {
        addEddies(-50);
        generateMissions();
        return true;
    }
    return false;
};

export const removeMission = (missionId: number) => {
    const current = gameStore.get().availableMissions;
    gameStore.setKey('availableMissions', current.filter(m => m.id !== missionId));
}

export const captureTerritory = (territoryId: number): boolean => {
    const state = gameStore.get();
    const territory = state.territories.find(t => t.id === territoryId);

    if (territory && !territory.controlled && !territory.rivalGang) {
        const cost = territory.income * 10;
        if (state.eddies >= cost) {
            addEddies(-cost);
            territory.controlled = true;
            gameStore.setKey('territories', [...state.territories]);
            return true;
        }
    }
    return false;
};

// Rival Gang Management
export const rivalGangManager = new RivalGangManager(gameStore);

export const attackTerritory = (territoryId: number, memberIds: number[]) => {
    const state = gameStore.get();
    const attackers = state.members.filter(m => memberIds.includes(m.id));

    const unavailable = attackers.filter(m => m.status !== 'IDLE' || m.injured);
    if (unavailable.length > 0) {
        return { success: false, message: 'Some members are unavailable!' };
    }

    const result = rivalGangManager.attackTerritory(territoryId, attackers);

    if (result.success && result.loot) {
        addEddies(result.loot);
        addRep(10);
    }

    gameStore.setKey('territories', [...state.territories]);
    gameStore.setKey('members', [...state.members]);

    return result;
};

export const addEncounter = (encounterId: string, x: number, y: number, duration: number) => {
    const state = gameStore.get();
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const newEncounter = {
        id,
        encounterId,
        x,
        y,
        expiresAt: Date.now() + duration
    };
    gameStore.setKey('activeEncounters', [...state.activeEncounters, newEncounter]);
    return id;
};

export const removeEncounter = (id: string) => {
    const state = gameStore.get();
    gameStore.setKey('activeEncounters', state.activeEncounters.filter(e => e.id !== id));
};

export const damageMember = (memberId: number, amount: number) => {
    const state = gameStore.get();
    const member = state.members.find(m => m.id === memberId);
    if (member) {
        member.health = Math.max(0, member.health - amount);
        if (member.health <= 0) {
            member.injured = true;
            member.status = 'INJURED';
        }
        gameStore.setKey('members', [...state.members]);
    }
};

// ==================== SAVE SYSTEM ====================

/**
 * Load saved game state (called by SaveManager)
 */
export const loadGameState = (savedState: GameState) => {
    // Update all keys from saved state
    Object.keys(savedState).forEach(key => {
        gameStore.setKey(key as keyof GameState, (savedState as any)[key]);
    });
    console.log('[GameStore] Game state loaded from save');
};

/**
 * Reset game state to initial values
 */
export const resetGameState = () => {
    gameStore.setKey('eddies', 1000);
    gameStore.setKey('rep', 10);
    gameStore.setKey('gangName', "V's Gang");
    gameStore.setKey('members', [
        {
            id: 1,
            name: 'V',
            class: 'SOLO',
            description: 'Your first crew member and right-hand.',
            art: 'biker',
            status: 'IDLE',
            level: 1,
            xp: 0,
            xpToNext: 100,
            health: 100,
            maxHealth: 100,
            injured: false,
            stats: {
                cool: 4,
                reflex: 4
            },
            currentMission: null
        }
    ]);
    gameStore.setKey('territories', [
        { id: 1, name: 'WATSON', controlled: false, income: 50 },
        { id: 2, name: 'WESTBROOK', controlled: false, income: 75 },
        { id: 3, name: 'CITY CENTER', controlled: false, income: 100 },
        { id: 4, name: 'SANTO DOMINGO', controlled: false, income: 60 },
        { id: 5, name: 'PACIFICA', controlled: false, income: 80 },
        { id: 6, name: 'THE GARAGE', controlled: true, income: 25 }
    ]);
    gameStore.setKey('activeMissions', []);
    gameStore.setKey('activeEncounters', []);
    generateMissions();
    rivalGangManager.initialize();
    console.log('[GameStore] Game state reset to initial values');
};

// Initial Setup
generateMissions();

// Initialize rival gangs after a short delay to ensure gameStore is ready
setTimeout(() => {
    rivalGangManager.initialize();
}, 100);

// Territory income every 10s
setInterval(() => {
    const state = gameStore.get();
    const income = state.territories.filter(t => t.controlled).reduce((sum, t) => sum + t.income, 0);
    if (income > 0) {
        addEddies(income);
        window.dispatchEvent(new CustomEvent('territory-income', { detail: { amount: income } }));
    }
}, 10000);

// Gang retaliation every 45s
setInterval(() => {
    rivalGangManager.attemptRetaliation();
}, 45000);
