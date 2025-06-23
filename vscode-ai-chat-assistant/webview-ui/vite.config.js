import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    root: './', // project root for webview-ui
    build: {
        outDir: '../dist', // output to main project’s dist/
        emptyOutDir: true,
        rollupOptions: {
        input: path.resolve(__dirname, 'src/main.tsx'), // entry point
        output: {
            entryFileNames: 'assets/index.js',
            assetFileNames: 'assets/index.css'
        }
        }
    }
});
//# sourceMappingURL=vite.config.js.map