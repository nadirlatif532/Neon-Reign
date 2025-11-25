import { createOverlay } from '../utils/UIUtils';

export function openDiplomacyTutorial(modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-black/95 border border-cp-yellow p-8 max-w-[500px] text-white font-cyber relative animate-modalSlideIn shadow-[0_0_50px_rgba(255,215,0,0.2)] pointer-events-auto';

    modal.innerHTML = `
        <h2 class="text-2xl text-cp-yellow font-bold mb-4 border-b border-gray-700 pb-2">DIPLOMACY GUIDE</h2>
        <div class="space-y-4 text-sm text-gray-300">
            <div>
                <strong class="text-white">RELATIONSHIP:</strong> Ranges from -100 (WAR) to +100 (ALLY).
                <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li><span class="text-red-500">WAR (-50):</span> They will attack your turf.</li>
                    <li><span class="text-green-400">FRIENDLY (+0):</span> Open to trade.</li>
                    <li><span class="text-cp-cyan">ALLY (+80):</span> Will defend you.</li>
                </ul>
            </div>
            <div>
                <strong class="text-white">PACTS:</strong>
                <ul class="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li><span class="text-cp-yellow">NON-AGGRESSION:</span> Prevents attacks for a duration.</li>
                    <li><span class="text-cp-cyan">ALLIANCE:</span> Mutual defense and shared intel.</li>
                </ul>
            </div>
            <div class="border-t border-gray-700 pt-2 mt-2">
                <strong class="text-cp-yellow">ACTIONS:</strong>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li><span class="text-white">BRIBE:</span> Pay eddies to improve relations.</li>
                    <li><span class="text-white">TRUCE:</span> End a war immediately.</li>
                    <li><span class="text-white">ALLIANCE:</span> Form a pact for mutual benefit.</li>
                </ul>
            </div>
        </div>
        <button class="mt-6 w-full bg-cp-yellow text-black font-bold py-2 hover:bg-white transition-colors">GOT IT</button>
    `;

    modal.querySelector('button')?.addEventListener('click', () => overlay.remove());
    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);
}

export function openTerritoryTutorial(modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const modal = document.createElement('div');
    modal.className = 'bg-cyber border-2 border-cp-cyan max-w-3xl mx-auto my-12 shadow-[0_0_30px_rgba(0,240,255,0.4)]';
    modal.innerHTML = `
        <div class="flex justify-between items-center p-4 bg-cp-cyan/10 border-b-2 border-cp-cyan">
            <h2 class="text-2xl font-cyber text-cp-cyan uppercase tracking-wider">Territory Warfare Guide</h2>
            <button id="close-tutorial" class="bg-transparent border-2 border-cp-cyan text-cp-cyan text-3xl w-10 h-10 cursor-pointer flex items-center justify-center font-bold hover:bg-cp-cyan hover:text-black transition-colors">&times;</button>
        </div>

        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Operations -->
            <div class="bg-black/30 p-4 border-l-4 border-cp-yellow">
                <h3 class="text-cp-yellow font-cyber text-xl mb-2 uppercase">Operations</h3>
                <div class="space-y-2 text-gray-300">
                    <div><span class="text-cp-cyan font-bold">SCOUT</span> - Gather intel on territories. Higher intel reveals Defense, Income, Garrison strength, and weaknesses.</div>
                    <div><span class="text-cp-cyan font-bold">SABOTAGE</span> - Weaken defenses covertly with minimal heat gain.</div>
                    <div><span class="text-cp-cyan font-bold">RAID</span> - Quick attack to steal eddies and weaken territory (increases heat).</div>
                    <div><span class="text-cp-cyan font-bold">ASSAULT</span> - Full attack to capture territory. Requires high power and generates massive heat.</div>
                    <div><span class="text-cp-cyan font-bold">FORTIFY</span> - Strengthen your territory's defenses.</div>
                </div>
            </div>

            <!-- Intel System -->
            <div class="bg-black/30 p-4 border-l-4 border-blue-400">
                <h3 class="text-blue-400 font-cyber text-xl mb-2 uppercase">Intel System</h3>
                <div class="space-y-2 text-gray-300">
                    <div>Intel unlocks progressive information about territories:</div>
                    <div class="ml-4">• <span class="text-cp-cyan">25%</span> - Defense & Stability</div>
                    <div class="ml-4">• <span class="text-cp-cyan">50%</span> - Income & Building Slots</div>
                    <div class="ml-4">• <span class="text-cp-cyan">75%</span> - Enemy Garrison Strength</div>
                    <div class="ml-4">• <span class="text-cp-cyan">100%</span> - Critical Weakness (+10% combat bonus)</div>
                </div>
            </div>

            <!-- Events -->
            <div class="bg-black/30 p-4 border-l-4 border-cp-yellow">
                <h3 class="text-cp-yellow font-cyber text-xl mb-2 uppercase">Global Events</h3>
                <div class="space-y-2 text-gray-300">
                    <div>Watch for random events that affect gameplay:</div>
                    <div class="ml-4">• <span class="text-cp-cyan">POLICE CRACKDOWN</span> - Heat rises faster</div>
                    <div class="ml-4">• <span class="text-cp-cyan">BLACK MARKET BOOM</span> - Increased income</div>
                    <div class="ml-4">• <span class="text-cp-cyan">GANG WARFARE</span> - Rivals distracted</div>
                </div>
            </div>

            <!-- Heat & Police -->
            <div class="bg-black/30 p-4 border-l-4 border-red-500">
                <h3 class="text-red-500 font-cyber text-xl mb-2 uppercase">Heat & Police</h3>
                <div class="space-y-2 text-gray-300">
                    <div><span class="text-cp-cyan font-bold">HEAT</span> - Increases with aggressive operations. High heat (80+) triggers police raids.</div>
                    <div><span class="text-cp-cyan font-bold">POLICE RAIDS</span> - Damage defense/stability and cost 500€ in bribes. Heat drops after raid.</div>
                    <div>Manage heat carefully to avoid costly interference.</div>
                </div>
            </div>

            <!-- Tips -->
            <div class="bg-black/30 p-4 border-l-4 border-green-400">
                <h3 class="text-green-400 font-cyber text-xl mb-2 uppercase">Strategic Tips</h3>
                <div class="space-y-2 text-gray-300">
                    <div>• Scout before assaulting to gain combat bonuses</div>
                    <div>• Use sabotage to weaken targets without raising heat</div>
                    <div>• Build relationships before demanding tribute or requesting proxy wars</div>
                    <div>• Monitor global events for strategic opportunities</div>
                    <div>• Fortify territories regularly to prevent enemy captures</div>
                </div>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    modal.querySelector('#close-tutorial')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}
