import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:30_000,
  fullyParallel:false,
  workers:1,
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  webServer:{
    command:'npm run build && node server.cjs --host 127.0.0.1 --port 4173',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:120_000,
    env:{...process.env,DRAGON_ISLE_DATA_DIR:'./.tmp-e2e-data'}
  },
  projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
