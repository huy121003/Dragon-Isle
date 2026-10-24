/* BUILD: React + Ant Design bundle to dist; the Node server currently provides game data. */
import {defineConfig} from 'vite';
const nativeBuild = process.env.VITE_NATIVE_BUILD === 'true';
export default defineConfig({base:nativeBuild?'./':'/',build:{outDir:'dist'}});
