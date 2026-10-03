/* DATA: Tạo bản cache JavaScript từ JSON để game vẫn mở được qua file://. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {loadDragonCatalog,loadGameCatalog}=require('../data/catalog-loader.cjs');
const dragons=loadDragonCatalog();
const game=loadGameCatalog();
require('./extend-catalog.cjs')(dragons,game);
const output='/* Cache tạo từ JSON, sửa data/*.json rồi chạy node scripts/build-cache.cjs. */\n'+
  'window.DragonDatabase='+JSON.stringify(dragons)+';\n'+
  'window.GameDatabase='+JSON.stringify(game)+';\n';
fs.writeFileSync(path.join(root,'js/data/db-cache.js'),output);
console.log('Đã cập nhật cache dữ liệu từ JSON.');
