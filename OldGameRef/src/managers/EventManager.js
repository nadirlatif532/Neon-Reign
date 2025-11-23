export class EventManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.eventInterval = null;
        this.minInterval = 30000; // 30 seconds
        this.maxInterval = 60000; // 60 seconds
    }

    start() {
        this.scheduleNextEvent();
    }

    stop() {
        if (this.eventInterval) {
            clearTimeout(this.eventInterval);
        }
    }

    scheduleNextEvent() {
        const delay = Math.floor(Math.random() * (this.maxInterval - this.minInterval + 1)) + this.minInterval;
        this.eventInterval = setTimeout(() => {
            this.triggerRandomEvent();
            this.scheduleNextEvent();
        }, delay);
    }

    triggerRandomEvent() {
        const events = ['RIVAL_RAID', 'POLICE_RAID', 'SMUGGLER_OFFER', 'MARKET_FLUCTUATION'];
        const type = events[Math.floor(Math.random() * events.length)];

        switch (type) {
            case 'RIVAL_RAID':
                this.handleRivalRaid();
                break;
            case 'POLICE_RAID':
                this.handlePoliceRaid();
                break;
            case 'SMUGGLER_OFFER':
                this.handleSmugglerOffer();
                break;
            case 'MARKET_FLUCTUATION':
                this.handleMarketFluctuation();
                break;
        }
    }

    handleRivalRaid() {
        const controlledTerritories = this.gm.territories.filter(t => t.controlled);
        if (controlledTerritories.length === 0) return; // Can't be raided if you own nothing

        // Chance to defend based on Rep (higher rep = better defense)
        // Base defense chance 30%, +1% per Rep point, max 90%
        const defenseChance = Math.min(0.9, 0.3 + (this.gm.rep * 0.01));

        if (Math.random() > defenseChance) {
            // Raid successful - lose a territory
            const target = controlledTerritories[Math.floor(Math.random() * controlledTerritories.length)];
            this.gm.loseTerritory(target.id);
            this.dispatch('RIVAL GANG TOOK ' + target.name + '!', 'bad');
        } else {
            // Raid repelled
            this.dispatch('RIVAL RAID REPELLED BY GANG REP!', 'good');
        }
    }

    handlePoliceRaid() {
        if (this.gm.eddies > 100) {
            const fine = Math.floor(this.gm.eddies * 0.1);
            this.gm.addEddies(-fine);
            this.dispatch(`NCPD RAID! BRIBED COPS WITH ${fine}€`, 'bad');
        } else {
            this.dispatch('NCPD RAID! THEY FOUND NOTHING.', 'neutral');
        }
    }

    handleSmugglerOffer() {
        const gain = Math.floor(Math.random() * 300) + 100;
        this.gm.addEddies(gain);
        this.dispatch(`SMUGGLER DEAL: GAINED ${gain}€`, 'good');
    }

    handleMarketFluctuation() {
        const boom = Math.random() > 0.5;
        if (boom) {
            this.gm.setRewardMultiplier(1.5, 20000); // 50% bonus for 20s
            this.dispatch('BLACK MARKET BOOM! REWARDS UP!', 'good');
        } else {
            this.gm.setRewardMultiplier(0.5, 20000); // 50% penalty for 20s
            this.dispatch('MARKET CRASH! REWARDS DOWN!', 'bad');
        }
    }

    dispatch(message, type) {
        window.dispatchEvent(new CustomEvent('game-event', {
            detail: {
                message: message,
                type: type
            }
        }));
    }
}
