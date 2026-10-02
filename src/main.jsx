import React from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider} from 'antd';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './app/query-client.js';
import {QueryClientProvider} from '@tanstack/react-query';
import GameShell from './app/GameShell.jsx';
import {queryClient} from './api/query-client.js';
import './ui.css';

const theme={token:{colorPrimary:'#298d80',colorInfo:'#298d80',borderRadius:14,
  fontFamily:'system-ui, sans-serif'},components:{Button:{controlHeight:38,fontWeight:700},Card:{borderRadiusLG:20}}};

createRoot(document.getElementById('react-root')).render(
  <QueryClientProvider client={queryClient}>
    <QueryClientProvider client={queryClient}><ConfigProvider theme={theme}><GameShell/></ConfigProvider></QueryClientProvider>
  </QueryClientProvider>
);
