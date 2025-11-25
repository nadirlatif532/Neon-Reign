
export function createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fadeIn';

    // Stop propagation of pointer events to prevent clicking through to the game
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    return overlay;
}

export function showToast(message: string, type: 'success' | 'warning' | 'error', container: HTMLElement = document.body) {
    const toast = document.createElement('div');
    const colors = {
        'success': 'bg-green-500',
        'warning': 'bg-yellow-500',
        'error': 'bg-red-500'
    };

    toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 ${colors[type]} text-black font-bold font-cyber z-[20000] animate-bounce shadow-[0_0_10px_currentColor]`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export function createScanlines(container: HTMLElement) {
    const scanlines = document.createElement('div');
    scanlines.className = 'scanlines pointer-events-none fixed inset-0 z-[50] opacity-10';
    container.appendChild(scanlines);
}

export function createClickParticle(x: number, y: number) {
    const particle = document.createElement('div');
    particle.className = 'absolute w-2 h-2 bg-cp-cyan rounded-full pointer-events-none z-[9999] animate-ping';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 500);
}

export function setupGlobalClickEffects() {
    document.addEventListener('click', (e) => {
        createClickParticle(e.clientX, e.clientY);
    });
}

export function showFloatingText(text: string, x: number, y: number, colorClass: string = 'text-white') {
    const el = document.createElement('div');
    el.className = `absolute pointer-events-none font-bold font-cyber text-lg z-[1000] animate-floatUp ${colorClass}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.textShadow = '0 0 5px currentColor';
    el.textContent = text;

    document.body.appendChild(el);

    el.onanimationend = () => el.remove();
}
