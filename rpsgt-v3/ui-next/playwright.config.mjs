import { defineConfig } from '@playwright/test';

const baseURL='http://127.0.0.1:4178';
export default defineConfig({
  testDir:'./tests/browser',
  outputDir:'./test-results',
  fullyParallel:false,
  workers:1,
  retries:0,
  timeout:60000,
  expect:{timeout:12000},
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{
    command:'node tests/preview-server.mjs',
    url:baseURL+'/case-review/',
    reuseExistingServer:false,
    timeout:90000,
  },
  projects:[
    {name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1440,height:900}}},
    {name:'tablet-chromium',use:{browserName:'chromium',viewport:{width:834,height:1112},hasTouch:true}},
    {name:'mobile-chromium',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
});
