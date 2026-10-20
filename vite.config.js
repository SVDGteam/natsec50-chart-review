import { defineConfig } from 'vite';
export default defineConfig({base:process.env.VITE_BASE_PATH||'/',esbuild:{jsx:"automatic"},server:{proxy:{'/api':'http://127.0.0.1:8765'}},build:{sourcemap:false}});
