/* BUILD: React + Ant Design bundle to dist; native builds use local-only saves. */
import {defineConfig} from 'vite';
const nativeBuild = process.env.VITE_NATIVE_BUILD === 'true';
export default defineConfig({
  base:nativeBuild?'./':'/',
  build:{outDir:'dist'},
  plugins:[{
    name:'dragon-isle-native-offline-flag',
    transformIndexHtml(html){
      return nativeBuild
        ? html.replace('<head>', '<head>\n  <script>window.DRAGON_OFFLINE_MODE = true;</script>')
        : html;
    }
  }]
});
