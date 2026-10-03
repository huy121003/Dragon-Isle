import React from 'react';

const resources={gold:{icon:'🪙',name:'gold'},food:{icon:'🍎',name:'food'},gems:{icon:'💎',name:'gems'}};

export default function ResourceAmount({kind,amount}){
  const resource=resources[kind];
  if(!resource)return null;
  const value=Number(amount||0).toLocaleString('en-US');
  return <span className={'resource-amount resource-'+kind} role="img" aria-label={`${value} ${resource.name}`}>
    <span className="resource-icon" aria-hidden="true">{resource.icon}</span>
    <span className="resource-value" aria-hidden="true">{value}</span>
  </span>;
}
