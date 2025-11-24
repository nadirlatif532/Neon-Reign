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
        // Manual chunk splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separate Phaser library (large, rarely changes)
                    'phaser': ['phaser'],
                    // Separate nanostores (smaller utility)
                    'vendor': ['nanostores'],
                },
            },
        },
        // Increase chunk size warning limit (we know Phaser is large)
        chunkSizeWarningLimit: 1000,
        // Enable minification with terser for better compression
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.logs in production
                drop_debugger: true,
            },
        },
        // Asset handling
        assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    }
});
