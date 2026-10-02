import React from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider} from 'antd';
import GameShell from './app/GameShell.jsx';
import './ui.css';

const theme={token:{colorPrimary:'#298d80',colorInfo:'#298d80',borderRadius:14,
  fontFamily:'system-ui, sans-serif'},components:{Button:{controlHeight:38,fontWeight:700},Card:{borderRadiusLG:20}}};

createRoot(document.getElementById('react-root')).render(
  <ConfigProvider theme={theme}><GameShell/></ConfigProvider>
);
