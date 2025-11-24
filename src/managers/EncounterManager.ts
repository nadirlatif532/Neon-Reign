import { gameStore, addEncounter, removeEncounter, addEddies, addRep, damageMember } from '@/state/GameStore';
import { ENCOUNTERS } from '@/data/Encounters';

export class EncounterManager {
    private spawnTimer: number | null = null;
    private checkTimer: number | null = null;
    private readonly MIN_SPAWN_TIME = 60000; // 60s
    private readonly MAX_SPAWN_TIME = 90000; // 90s
    private readonly ENCOUNTER_DURATION_MIN = 120000; // 2 mins
    private readonly ENCOUNTER_DURATION_MAX = 240000; // 4 mins
    private readonly MAX_ENCOUNTERS = 3;

    constructor() {
        this.startSpawning(20000); // First spawn at 20s
        this.startExpirationCheck();
    }

    private startSpawning(delay?: number) {
        const nextSpawnTime = delay ?? (Math.floor(Math.random() * (this.MAX_SPAWN_TIME - this.MIN_SPAWN_TIME + 1)) + this.MIN_SPAWN_TIME);

        this.spawnTimer = window.setTimeout(() => {
            this.spawnEncounter();
            this.startSpawning(); // Schedule next spawn with random time
        }, nextSpawnTime);
    }

    private startExpirationCheck() {
        this.checkTimer = window.setInterval(() => {
            const state = gameStore.get();
            const now = Date.now();
            state.activeEncounters.forEach(encounter => {
                if (now > encounter.expiresAt) {
                    removeEncounter(encounter.id);
                }
            });
        }, 1000);
    }

    private spawnEncounter() {
        const state = gameStore.get();
        if (state.activeEncounters.length >= this.MAX_ENCOUNTERS) return;

        const encounter = ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)];

        // Define exclusion zones for buildings (based on CityScene positions)
        // Format: { x: center%, y: center%, width: %, height: % }
        const exclusionZones = [
            // Desktop positions (will work fine for mobile too as fallback)
            { x: 65, y: 40, width: 25, height: 25 }, // Afterlife (increased from 15x15)
            { x: 25, y: 45, width: 28, height: 28 }, // Hideout/HQ (increased from 18x18)
            { x: 80, y: 60, width: 25, height: 25 }, // Ripperdoc (increased from 15x15)
        ];

        // Try to find a valid spawn position (with collision detection)
        let x: number = 0;
        let y: number = 0;
        let attempts = 0;
        const maxAttempts = 50;

        // Encounter marker is w-16 h-16 (64px), which is roughly 4% of viewport width
        // The diamond rotated 45deg takes up the full space
        const markerSize = 4; // percent

        do {
            // Generate random position (avoiding edges and footer)
            x = Math.floor(Math.random() * 80) + 10; // 10-90%
            y = Math.floor(Math.random() * 70) + 10; // 10-80%

            // Check if the ENTIRE marker area collides with any exclusion zone
            // We need to check the bounds of the marker, not just its center
            const collides = exclusionZones.some(zone => {
                const halfWidth = zone.width / 2;
                const halfHeight = zone.height / 2;
                const halfMarker = markerSize / 2;

                // Check if marker's bounding box overlaps with exclusion zone
                const markerLeft = x - halfMarker;
                const markerRight = x + halfMarker;
                const markerTop = y - halfMarker;
                const markerBottom = y + halfMarker;

                const zoneLeft = zone.x - halfWidth;
                const zoneRight = zone.x + halfWidth;
                const zoneTop = zone.y - halfHeight;
                const zoneBottom = zone.y + halfHeight;

                // AABB collision detection
                return !(markerRight < zoneLeft ||
                    markerLeft > zoneRight ||
                    markerBottom < zoneTop ||
                    markerTop > zoneBottom);
            });

            if (!collides) break; // Found valid position
            attempts++;
        } while (attempts < maxAttempts);

        // If we couldn't find a valid position after max attempts, skip spawning
        if (attempts >= maxAttempts) {
            console.warn('Could not find valid spawn position for encounter after', maxAttempts, 'attempts');
            return;
        }

        const duration = Math.floor(Math.random() * (this.ENCOUNTER_DURATION_MAX - this.ENCOUNTER_DURATION_MIN + 1)) + this.ENCOUNTER_DURATION_MIN;

        addEncounter(encounter.id, x, y, duration);
    }

    public resolveEncounter(encounterId: string, optionIndex: number): {
        message: string;
        success: boolean;
        effects: {
            cost?: number;
            rewards?: { eddies?: number; xp?: number; rep?: number; health?: number; targetName?: string };
            penalties?: { eddies?: number; health?: number; rep?: number; targetName?: string };
        };
    } {
        const encounter = ENCOUNTERS.find(e => e.id === encounterId);
        if (!encounter) return {
            message: 'Error: Encounter not found',
            success: false,
            effects: {}
        };

        const option = encounter.options[optionIndex];
        const state = gameStore.get();
        const members = state.members;

        // Track all applied effects
        const appliedEffects: {
            cost?: number;
            rewards?: { eddies?: number; xp?: number; rep?: number; health?: number; targetName?: string };
            penalties?: { eddies?: number; health?: number; rep?: number; targetName?: string };
        } = {};

        // Check costs
        if (option.cost && state.eddies < option.cost) {
            return {
                message: 'Not enough eddies!',
                success: false,
                effects: {}
            };
        }

        // Check skills
        let success = true;
        if (option.skillCheck) {
            const statName = option.skillCheck.stat === 'tech' ? 'cool' : option.skillCheck.stat; // Fallback for tech
            const bestStat = Math.max(...members.map(m => m.stats[statName] || 0));
            const roll = Math.floor(Math.random() * 10) + 1;
            success = (roll + bestStat) >= option.skillCheck.difficulty;
        }

        // Apply outcome
        const result = option.outcome(success, members);

        if (option.cost) {
            appliedEffects.cost = option.cost;
            addEddies(-option.cost);
        }

        if (result.rewards) {
            appliedEffects.rewards = {};
            if (result.rewards.eddies) {
                appliedEffects.rewards.eddies = result.rewards.eddies;
                addEddies(result.rewards.eddies);
            }
            if (result.rewards.rep) {
                appliedEffects.rewards.rep = result.rewards.rep;
                addRep(result.rewards.rep);
            }
            if (result.rewards.xp) {
                appliedEffects.rewards.xp = result.rewards.xp;
            }
            if (result.rewards.health) {
                const damagedMembers = members.filter(m => m.health < m.maxHealth);
                if (damagedMembers.length > 0) {
                    appliedEffects.rewards.health = result.rewards.health;
                    const luckyMember = damagedMembers[Math.floor(Math.random() * damagedMembers.length)];
                    damageMember(luckyMember.id, -result.rewards.health);
                    appliedEffects.rewards.targetName = luckyMember.name;
                }
            }
        }

        if (result.penalties) {
            appliedEffects.penalties = {};
            if (result.penalties.eddies) {
                appliedEffects.penalties.eddies = result.penalties.eddies;
                addEddies(-result.penalties.eddies);
            }
            if (result.penalties.rep) {
                appliedEffects.penalties.rep = result.penalties.rep;
                addRep(result.penalties.rep);
            }

            if (result.penalties.health) {
                const validMembers = members.filter(m => !m.injured && m.health > 0);
                if (validMembers.length > 0) {
                    appliedEffects.penalties.health = result.penalties.health;
                    const victim = validMembers[Math.floor(Math.random() * validMembers.length)];
                    damageMember(victim.id, result.penalties.health);
                    appliedEffects.penalties.targetName = victim.name;
                }
            }
        }

        return { message: result.message, success, effects: appliedEffects };
    }

    public stop() {
        if (this.spawnTimer !== null) {
            window.clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.checkTimer !== null) {
            window.clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
    }
}

export const encounterManager = new EncounterManager();
