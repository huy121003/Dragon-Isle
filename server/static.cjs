const fs=require('node:fs/promises');
const path=require('node:path');
const {reply}=require('./http.cjs');
const {loadDragonCatalog,loadGameCatalog}=require('../data/catalog-loader.cjs');

function createStaticHandler({root,dataDir}){
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
  return async function handle(req,res,pathname){
    if(req.method!=='GET'&&req.method!=='HEAD'){reply(res,405,'Phương thức không hỗ trợ.');return;}
    if(pathname==='/js/data/db-cache.js'){
      const dragons=loadDragonCatalog(dataDir),game=loadGameCatalog(dataDir);
      require('../scripts/extend-catalog.cjs')(dragons,game);
      const source='/* DATA: Bản cập nhật trực tiếp từ JSON. */\nwindow.DragonDatabase='+
        JSON.stringify(dragons)+';\nwindow.GameDatabase='+JSON.stringify(game)+';\n';
      reply(res,200,source,'text/javascript; charset=utf-8');return;
    }
    if(pathname==='/data/dragons.json'||pathname==='/data/game.json'){
      const dragons=loadDragonCatalog(dataDir),game=loadGameCatalog(dataDir);
      require('../scripts/extend-catalog.cjs')(dragons,game);
      reply(res,200,req.method==='HEAD'?'':JSON.stringify(pathname==='/data/dragons.json'?dragons:game),
        'application/json; charset=utf-8');return;
    }
    if(!(['/', '/index.html', '/css/style.css', '/debug/gallery.html',
        '/data/dragons.json', '/data/game.json', '/data/economy.js'].includes(pathname)||
        pathname.startsWith('/assets/')||pathname.startsWith('/js/'))){
      reply(res,403,'Không được truy cập.');return;
    }
    const publicPath=pathname==='/'||pathname==='/index.html'?path.join(root,'dist','index.html'):
      pathname.startsWith('/assets/')?path.resolve(root,'dist','.'+pathname):path.resolve(root,'.'+pathname);
    const dist=path.join(root,'dist');
    if(!publicPath.startsWith(root+path.sep)||
      (pathname.startsWith('/assets/')&&!publicPath.startsWith(dist+path.sep))||
      pathname.startsWith('/src/')||pathname.startsWith('/node_modules/')||
      pathname.startsWith('/dist/')||pathname==='/package.json'||pathname==='/package-lock.json'||
      pathname==='/vite.config.mjs'){
      reply(res,403,'Đường dẫn không hợp lệ.');return;
    }
    const body=await fs.readFile(publicPath);
    reply(res,200,req.method==='HEAD'?'':body,types[path.extname(publicPath)]||'application/octet-stream');
  };
}
module.exports={createStaticHandler};
