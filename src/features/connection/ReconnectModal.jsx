import React from 'react';
import {Button,Modal,Progress,Spin,Typography} from 'antd';
import {connectionApi} from '../../app/game-bridge.js';

export default function ReconnectModal({connection,now=Date.now()}){
  const reconnectSeconds=Math.max(0,Math.ceil(((connection?.nextRetryAt||0)-now)/1000));
  const prolonged=!!connection?.since&&now-connection.since>=120000;
  return <Modal className="connection-modal" open={!!connection?.blocked} closable={false}
    maskClosable={false} keyboard={false} footer={null} centered zIndex={5000} destroyOnHidden={false}>
    <div className="reconnect-panel">
      <Spin size="large"/>
      <Typography.Title level={3}>
        {connection?.status==='session-expired'?'Session expired':
          prolonged?'Still trying to reconnect…':'Connection lost'}
      </Typography.Title>
      <Typography.Paragraph>
        {connection?.status==='session-expired'?
          'The server confirmed that this session is no longer valid. Returning to sign in…':
          prolonged?
            'The server is still unavailable. Your latest unsent progress is kept in this tab. Do not close the page while reconnecting.':
            'The game cannot reach the server. Progress is queued safely and gameplay is temporarily locked.'}
      </Typography.Paragraph>
      {connection?.status!=='session-expired'&&<>
        <Typography.Text type="secondary">
          {reconnectSeconds>0?'Retrying automatically in '+reconnectSeconds+'s…':'Checking server now…'}
        </Typography.Text>
        <Progress percent={Math.max(0,Math.min(100,100-reconnectSeconds/5*100))} showInfo={false}/>
        <Button type="primary" onClick={()=>connectionApi()?.retry()}>Try again now</Button>
      </>}
    </div>
  </Modal>;
}
