import { gameStore, Territory } from '@/state/GameStore';
import { rivalGangManager } from '@/managers/RivalGangManager';


export class MapInterface {
    private container: HTMLElement;
    private svgLayer: SVGSVGElement;
    private nodesLayer: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'relative w-full h-full bg-black/80 overflow-hidden';

        // SVG Layer for connections and polygons
        this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgLayer.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-0');
        this.svgLayer.setAttribute('viewBox', '0 0 100 100');
        this.svgLayer.setAttribute('preserveAspectRatio', 'none');
        this.container.appendChild(this.svgLayer);

        // Nodes Layer
        this.nodesLayer = document.createElement('div');
        this.nodesLayer.className = 'absolute inset-0 z-10 pointer-events-none';
        this.container.appendChild(this.nodesLayer);
    }

    public mount(parent: HTMLElement) {
        parent.innerHTML = '';
        parent.appendChild(this.container);
        this.render();

        // Auto-refresh on game events
        window.addEventListener('warfare-update', () => this.render());
    }

    private render() {
        const state = gameStore.get();
        const territories = state.territories;

        // Clear previous
        this.svgLayer.innerHTML = '';
        this.nodesLayer.innerHTML = '';

        // Draw Polygons first (background)
        this.drawTerritories(territories);

        // Draw Connections (Overlay)
        this.drawConnections(territories);

        // Draw Nodes (Icons/Labels)
        territories.forEach(t => {
            this.createNode(t);
        });
    }

    private drawTerritories(territories: Territory[]) {
        territories.forEach(t => {
            if (!t.polygonPoints) return;

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', t.polygonPoints);

            // Styling
            const isPlayer = t.controlled;
            const rival = t.rivalGang ? rivalGangManager.getGangByTerritory(t.id) : null;

            // Use the territory's specific color, or fallback
            const baseColor = t.color || '#555';

            let fillColor = this.hexToRgba(baseColor, 0.2);
            let strokeColor = baseColor;
            let strokeWidth = '0.5';

            if (isPlayer) {
                fillColor = this.hexToRgba(baseColor, 0.5); // Brighter fill for player
                strokeWidth = '1';
            } else if (rival) {
                fillColor = this.hexToRgba(baseColor, 0.3);
            }

            polygon.setAttribute('fill', fillColor);
            polygon.setAttribute('stroke', strokeColor);
            polygon.setAttribute('stroke-width', strokeWidth);
            polygon.setAttribute('class', 'transition-all duration-300 hover:fill-opacity-70 cursor-pointer pointer-events-auto');

            // Heat Effect (Glow)
            if (t.heat > 0) {
                if (t.heat > 75) {
                    polygon.setAttribute('stroke-width', '1.5');
                    polygon.classList.add('animate-pulse');
                }
            }

            // Interaction
            polygon.addEventListener('mouseenter', () => {
                polygon.setAttribute('fill', this.hexToRgba(baseColor, 0.6));
            });

            polygon.addEventListener('mouseleave', () => {
                polygon.setAttribute('fill', fillColor);
            });

            polygon.addEventListener('click', () => {
                this.openTerritoryDetails(t);
            });

            this.svgLayer.appendChild(polygon);
        });
    }

    private hexToRgba(hex: string, alpha: number) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private drawConnections(territories: Territory[]) {
        // Define connections (Adjacency list)
        const connections = [
            [1, 2], // Watson <-> Westbrook
            [1, 3], // Watson <-> City Center
            [2, 3], // Westbrook <-> City Center
            [2, 5], // Westbrook <-> Santo Domingo
            [3, 4], // City Center <-> Heywood
            [4, 5], // Heywood <-> Santo Domingo
            [4, 6], // Heywood <-> Pacifica
            [5, 6], // Santo Domingo <-> Pacifica
            [6, 7], // Pacifica <-> Badlands
            [5, 7]  // Santo Domingo <-> Badlands
        ];

        connections.forEach(([idA, idB]) => {
            const tA = territories.find(t => t.id === idA);
            const tB = territories.find(t => t.id === idB);

            if (tA && tB) {
                this.drawLine(tA, tB);
            }
        });
    }

    private drawLine(tA: Territory, tB: Territory) {
        if (!tA.coordinates || !tB.coordinates) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        // Use coordinates directly as 0-100 in viewBox
        line.setAttribute('x1', `${tA.coordinates.x}`);
        line.setAttribute('y1', `${tA.coordinates.y}`);
        line.setAttribute('x2', `${tB.coordinates.x}`);
        line.setAttribute('y2', `${tB.coordinates.y}`);
        line.setAttribute('stroke', '#00F0FF');
        line.setAttribute('stroke-width', '0.5');
        line.setAttribute('stroke-opacity', '0.2');
        this.svgLayer.appendChild(line);
    }

    private createNode(t: Territory) {
        const node = document.createElement('div');
        const isPlayer = t.controlled;
        const rival = t.rivalGang ? rivalGangManager.getGangByTerritory(t.id) : null;
        const color = isPlayer ? '#00F0FF' : (rival?.color || '#555');

        // Node container positioned by percentage
        node.className = `absolute -ml-10 -mt-4 w-20 flex flex-col items-center justify-center cursor-pointer group pointer-events-auto transition-transform hover:scale-110`;
        node.style.left = `${t.coordinates.x}%`;
        node.style.top = `${t.coordinates.y}%`;

        // Inner Icon/Text
        node.innerHTML = `
            <div class="text-[10px] font-bold text-white font-cyber bg-black/70 px-2 py-1 rounded border border-[${color}] shadow-[0_0_10px_${color}40] whitespace-nowrap hover:bg-black/90 transition-colors">${t.name}</div>
        `;

        // Tooltip Logic
        const showTooltip = () => {
            const tooltip = document.createElement('div');
            tooltip.id = `tooltip-${t.id}`;
            tooltip.className = `fixed z-[9999] bg-black/90 border border-[${color}] p-2 rounded pointer-events-none shadow-[0_0_20px_rgba(0,0,0,0.8)]`;
            tooltip.innerHTML = `
                <div class="text-[${color}] font-bold uppercase text-sm">${t.name}</div>
                <div class="text-xs text-gray-400">${t.description}</div>
                <div class="mt-1 flex justify-between text-xs gap-4">
                    <span class="text-cp-cyan">DEF: ${t.defense}%</span>
                    <span class="text-cp-yellow">STAB: ${t.stability}%</span>
                </div>
                <div class="mt-1 flex justify-between text-xs gap-4">
                    <span class="${t.heat > 70 ? 'text-red-500 font-bold' : 'text-gray-400'}">HEAT: ${t.heat}%</span>
                    <span class="text-gray-500">SLOTS: ${t.slots}</span>
                </div>
                ${t.rivalGang ? `<div class="mt-1 text-xs text-red-500">Controlled by: ${rival?.name}</div>` : ''}
            `;

            document.body.appendChild(tooltip);

            const rect = node.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - 100}px`; // Center horizontally
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`; // Position above
        };

        const hideTooltip = () => {
            const tooltip = document.getElementById(`tooltip-${t.id}`);
            if (tooltip) tooltip.remove();
        };

        node.addEventListener('mouseenter', showTooltip);
        node.addEventListener('mouseleave', hideTooltip);
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            hideTooltip(); // Hide tooltip on click
            this.openTerritoryDetails(t);
        });

        this.nodesLayer.appendChild(node);
    }

    public cleanupTooltips() {
        document.querySelectorAll('[id^="tooltip-"]').forEach(el => el.remove());
    }

    private openTerritoryDetails(t: Territory) {
        window.dispatchEvent(new CustomEvent('open-territory-details', { detail: { territoryId: t.id } }));
    }
}
