import React from 'react';
import LegacyContent from './LegacyContent.jsx';
import {read} from '../app/game-bridge.js';
import {useAppStore} from '../app/store.js';

/** Re-render a compatibility panel only for the runtime changes that affect it. */
export default function RuntimeContent({id,world=false,ui=false}){
  const uiRevision=useAppStore(store=>ui?store.uiRevision:0);
  const worldRevision=useAppStore(store=>world?store.worldRevision:0);
  void uiRevision;void worldRevision;
  return <LegacyContent html={read(id)}/>;
}
