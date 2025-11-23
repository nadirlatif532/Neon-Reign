import { defineConfig } from 'vite';
// Force restart
import glsl from 'vite-plugin-glsl';
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    base: '/',
    plugins: [
        glsl(),
        // checker({ typescript: true }),
        // VitePWA({ registerType: 'autoUpdate' })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
    },
    build: {
        target: 'esnext',
    }
});
