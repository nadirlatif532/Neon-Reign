import { gameStore, setGangName, resetGameState } from '../../state/GameStore';
import { saveManager } from '../../managers/SaveManager';
import { audioManager } from '../../managers/AudioManager';
import { createOverlay, showToast } from '../utils/UIUtils';

export function openSettingsPanel(modalContainer: HTMLElement) {
    const overlay = createOverlay();

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[500px] p-6 flex flex-col gap-4 animate-modalSlideIn pointer-events-auto relative';

    const musicVol = audioManager.getMusicVolume();
    const sfxVol = audioManager.getSfxVolume();

    modal.innerHTML = `
    <div class="flex justify-between items-center border-b border-cp-cyan pb-2 mb-2">
      <h2 class="text-cp-cyan m-0 text-2xl drop-shadow-[0_0_10px_var(--cp-cyan)] font-cyber font-bold">SETTINGS</h2>
      <button id="close-settings" class="text-cp-red font-bold hover:text-white">&times;</button>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label class="text-cp-yellow font-cyber text-sm">MUSIC VOLUME</label>
        <input type="range" id="music-vol" min="0" max="100" step="1" value="${musicVol}" class="w-full accent-cp-cyan">
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-cp-yellow font-cyber text-sm">SFX VOLUME</label>
        <input type="range" id="sfx-vol" min="0" max="100" step="1" value="${sfxVol}" class="w-full accent-cp-cyan">
      </div>
      
      <div class="border-t border-gray-700 my-2"></div>

      <div class="flex flex-col gap-3">
        <button id="change-name-btn" class="cyber-btn w-full py-2">CHANGE GANG NAME</button>
        
        <div class="grid grid-cols-2 gap-3">
           <button id="export-save-btn" class="cyber-btn py-2 text-sm border-cp-yellow text-cp-yellow hover:bg-cp-yellow hover:text-black">EXPORT SAVE</button>
           <button id="import-save-btn" class="cyber-btn py-2 text-sm border-cp-yellow text-cp-yellow hover:bg-cp-yellow hover:text-black">IMPORT SAVE</button>
        </div>
        <input type="file" id="import-file-input" accept=".json" class="hidden" />

        <button id="reset-btn" class="cyber-btn w-full py-2 border-cp-red text-cp-red hover:bg-cp-red hover:text-white mt-2">RESET GAME DATA</button>
      </div>
    </div>
  `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    // Listeners
    const musicSlider = modal.querySelector('#music-vol') as HTMLInputElement;
    const sfxSlider = modal.querySelector('#sfx-vol') as HTMLInputElement;

    musicSlider.addEventListener('input', (e) => {
        const vol = parseFloat((e.target as HTMLInputElement).value);
        audioManager.setMusicVolume(vol);
        saveSettings();
    });

    sfxSlider.addEventListener('input', (e) => {
        const vol = parseFloat((e.target as HTMLInputElement).value);
        audioManager.setSfxVolume(vol);
        saveSettings();
    });

    modal.querySelector('#close-settings')?.addEventListener('click', () => {
        audioManager.playClick();
        overlay.remove();
    });

    modal.querySelector('#change-name-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        overlay.remove();
        showGangNameModal(modalContainer);
    });

    modal.querySelector('#reset-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        overlay.remove();
        showResetConfirmationModal(modalContainer);
    });

    // Export Save Logic
    modal.querySelector('#export-save-btn')?.addEventListener('click', () => {
        audioManager.playClick();
        try {
            const json = saveManager.exportSaveData();
            if (json) {
                // Trigger download
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bikergang-save-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast('SAVE EXPORTED SUCCESSFULLY', 'success');
            } else {
                showToast('NO SAVE DATA TO EXPORT', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('ERROR EXPORTING SAVE', 'error');
        }
    });

    // Import Save Logic
    const fileInput = modal.querySelector('#import-file-input') as HTMLInputElement;
    const importBtn = modal.querySelector('#import-save-btn');

    importBtn?.addEventListener('click', () => {
        audioManager.playClick();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const success = saveManager.importSaveData(json);
                if (success) {
                    showToast('SAVE IMPORTED! RELOADING...', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showToast('INVALID SAVE FILE', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('ERROR IMPORTING SAVE', 'error');
            }
        };
        reader.readAsText(file);
    });
}

export function saveSettings() {
    const musicVol = audioManager.getMusicVolume();
    const sfxVol = audioManager.getSfxVolume();

    saveManager.saveSettings({
        musicVolume: musicVol,
        sfxVolume: sfxVol,
        musicEnabled: true,
        sfxEnabled: true
    });
}

export function resetGame() {
    resetGameState();
    window.location.reload();
}

export function showResetConfirmationModal(modalContainer: HTMLElement) {
    const overlay = createOverlay();

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-red shadow-[0_0_40px_rgba(255,0,0,0.5)] w-[90%] max-w-[400px] p-6 flex flex-col gap-4 animate-modalSlideIn pointer-events-auto text-center';

    modal.innerHTML = `
    <h2 class="text-cp-red m-0 text-2xl font-cyber font-bold">WARNING</h2>
    <p class="text-white">Are you sure you want to reset all progress? This cannot be undone.</p>
    
    <div class="flex gap-3 justify-center mt-4">
      <button id="cancel-reset" class="cyber-btn px-6 py-2">CANCEL</button>
      <button id="confirm-reset" class="cyber-btn px-6 py-2 border-cp-red text-cp-red hover:bg-cp-red hover:text-white">RESET</button>
    </div>
  `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    modal.querySelector('#cancel-reset')?.addEventListener('click', () => {
        audioManager.playClick();
        overlay.remove();
    });

    modal.querySelector('#confirm-reset')?.addEventListener('click', () => {
        audioManager.playClick();
        resetGame();
    });
}

export function showGangNameModal(modalContainer: HTMLElement) {
    const overlay = createOverlay();
    const state = gameStore.get();
    const isInitial = !state.gangName || state.gangName === 'Unknown Gang';

    const modal = document.createElement('div');
    modal.className = 'bg-cp-bg border-[3px] border-cp-cyan shadow-[0_0_40px_rgba(0,240,255,0.5)] w-[90%] max-w-[400px] p-6 flex flex-col gap-4 animate-modalSlideIn pointer-events-auto';

    modal.innerHTML = `
    <h2 class="text-cp-cyan m-0 text-2xl font-cyber font-bold">GANG IDENTITY</h2>
    <p class="text-gray-300 text-sm">Enter the name of your biker gang.</p>
    
    <input type="text" id="gang-name-input" class="bg-black/50 border-2 border-cp-cyan p-3 text-white font-cyber text-lg focus:outline-none focus:shadow-[0_0_15px_var(--cp-cyan)]" placeholder="ENTER NAME..." maxlength="20" value="${isInitial ? '' : state.gangName}">
    
    <button id="confirm-name" class="cyber-btn w-full py-3 text-lg">CONFIRM</button>
  `;

    overlay.appendChild(modal);
    modalContainer.appendChild(overlay);

    const input = modal.querySelector('#gang-name-input') as HTMLInputElement;
    const btn = modal.querySelector('#confirm-name') as HTMLButtonElement;

    input.focus();

    const confirm = () => {
        const name = input.value.trim();
        if (name.length > 0) {
            setGangName(name);
            audioManager.playPurchase(); // Sound effect
            showToast(`GANG NAME SET: ${name}`, 'success');
            overlay.remove();
        } else {
            showToast('NAME CANNOT BE EMPTY', 'error');
            input.classList.add('animate-shake');
            setTimeout(() => input.classList.remove('animate-shake'), 500);
        }
    };

    btn.addEventListener('click', confirm);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirm();
    });
}
