import {useAppStore} from '../../store/app-store.js';
export function syncConnectionState(){
 const connection=window.DragonConnectionState||{status:'connected',blocked:false,since:0,nextRetryAt:0,attempts:0,message:''};
 useAppStore.setState({connection:{...connection}});return connection;
}
